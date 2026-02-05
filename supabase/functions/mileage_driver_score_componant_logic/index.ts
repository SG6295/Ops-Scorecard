import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type RequestPayload = {
  month_run_id: string;
};

function parseNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  const text = String(value).trim();
  if (!text) return null;
  const cleaned = text.replace(/,/g, '').replace(/%/g, '');
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const body = (await req.json()) as RequestPayload;
    const monthRunId = body.month_run_id?.trim();

    if (!monthRunId) {
      return new Response(JSON.stringify({ error: 'month_run_id is required' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { error: deleteError } = await supabase
      .from('mileage_driver_score_componant')
      .delete()
      .eq('month_run_id', monthRunId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    const driverCounts: Record<string, Record<string, number>> = {};
    const vehicles = new Set<string>();

    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('operation_summary_report')
        .select('vehicle_no, driver_name')
        .eq('month_run_id', monthRunId)
        .range(from, from + pageSize - 1);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      if (!data || data.length === 0) break;

      for (const row of data) {
        const vehicle = row.vehicle_no?.toString().trim();
        if (!vehicle) continue;
        vehicles.add(vehicle);
        const driver = row.driver_name?.toString().trim();
        if (!driver) continue;
        if (!driverCounts[vehicle]) driverCounts[vehicle] = {};
        driverCounts[vehicle][driver] = (driverCounts[vehicle][driver] ?? 0) + 1;
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    const dieselMap: Record<string, {
      ideal_mileage: number | null;
      total_km: number | null;
      diesel_in_litres: number | null;
      mileage: number | null;
    }> = {};

    if (vehicles.size > 0) {
      let fromDiesel = 0;
      const dieselPageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('diesel_report')
          .select('vehicle_number, ideal_mileage, total_km, diesel_in_litres, mileage')
          .eq('month_run_id', monthRunId)
          .range(fromDiesel, fromDiesel + dieselPageSize - 1);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        if (!data || data.length === 0) break;

        for (const row of data) {
          const vehicle = row.vehicle_number?.toString().trim();
          if (!vehicle) continue;
          dieselMap[vehicle] = {
            ideal_mileage: parseNumber(row.ideal_mileage),
            total_km: parseNumber(row.total_km),
            diesel_in_litres: parseNumber(row.diesel_in_litres),
            mileage: parseNumber(row.mileage)
          };
        }

        if (data.length < dieselPageSize) break;
        fromDiesel += dieselPageSize;
      }
    }

    const rowsToInsert = Array.from(vehicles).map((vehicle) => {
      const drivers = driverCounts[vehicle] ?? {};
      let selectedDriver: string | null = null;
      let maxCount = -1;
      for (const [driver, count] of Object.entries(drivers)) {
        if (count > maxCount) {
          selectedDriver = driver;
          maxCount = count;
        }
      }

      const diesel = dieselMap[vehicle];
      const avgMileage = diesel?.mileage ?? null;
      const idealMileage = diesel?.ideal_mileage ?? null;
      let averageMileageText = 'No Diesel logs';
      let variation = 'No diesel logs';

      if (avgMileage !== null) {
        averageMileageText = String(avgMileage);
      }

      if (avgMileage !== null && idealMileage !== null && idealMileage !== 0) {
        if (avgMileage > idealMileage * 1.5) {
          variation = 'Over Positive';
        } else if (avgMileage > idealMileage) {
          variation = 'Positive';
        } else if (avgMileage < idealMileage) {
          const pct = ((idealMileage - avgMileage) / idealMileage) * 100;
          variation = `${pct.toFixed(2)}%`;
        } else {
          variation = '0%';
        }
      }

      if (avgMileage === null || idealMileage === null) {
        variation = 'No diesel logs';
      }

      return {
        month_run_id: monthRunId,
        vehicle_number: vehicle,
        ideal_mileage: idealMileage,
        driver_name: selectedDriver,
        total_kms: diesel?.total_km ?? null,
        total_diesel: diesel?.diesel_in_litres ?? null,
        average_mileage: avgMileage === null ? 'No Diesel logs' : String(avgMileage),
        variation
      };
    });

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('mileage_driver_score_componant')
        .insert(rowsToInsert);

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
      }
    }

    return new Response(
      JSON.stringify({
        month_run_id: monthRunId,
        rows_inserted: rowsToInsert.length
      }),
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
