import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type RequestPayload = {
  month_run_id: string;
};

const nullLikes = new Set(['', 'NA', 'N/A', 'N.A.', '-', 'null', 'NULL']);

function normalize(value: string | null) {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (nullLikes.has(trimmed)) return null;
  return trimmed;
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
      .from('spare_usage_driver_score_componant')
      .delete()
      .eq('month_run_id', monthRunId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    const perEmployee: Record<string, { employee_id: string; count: number }> = {};
    const nameCounts: Record<string, Record<string, number>> = {};

    const pageSize = 1000;
    let fromDrivers = 0;
    const prefixRegex = /^([^\-]+?)\s*-/;

    // Pull all drivers from operation summary report first
    while (true) {
      const { data: drivers, error: driverError } = await supabase
        .from('operation_summary_report')
        .select('driver_name')
        .eq('month_run_id', monthRunId)
        .range(fromDrivers, fromDrivers + pageSize - 1);

      if (driverError) {
        return new Response(JSON.stringify({ error: driverError.message }), { status: 500 });
      }

      if (!drivers || drivers.length === 0) break;

      for (const row of drivers) {
        const name = normalize(row.driver_name);
        if (!name) continue;
        const match = name.match(prefixRegex);
        const employeeId = match ? match[1].trim() : name;

        if (!perEmployee[employeeId]) {
          perEmployee[employeeId] = { employee_id: employeeId, count: 0 };
        }
        if (!nameCounts[employeeId]) nameCounts[employeeId] = {};
        nameCounts[employeeId][name] = (nameCounts[employeeId][name] ?? 0) + 1;
      }

      if (drivers.length < pageSize) break;
      fromDrivers += pageSize;
    }

    // Count spare usage by employee_id from spare utilization report
    let fromSpare = 0;
    while (true) {
      const { data, error } = await supabase
        .from('spare_utilization_report')
        .select('scheduled_employee_id')
        .eq('month_run_id', monthRunId)
        .range(fromSpare, fromSpare + pageSize - 1);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      if (!data || data.length === 0) break;

      for (const row of data) {
        const employeeId = normalize(row.scheduled_employee_id);
        if (!employeeId) continue;
        if (!perEmployee[employeeId]) {
          perEmployee[employeeId] = { employee_id: employeeId, count: 0 };
        }
        perEmployee[employeeId].count += 1;
      }

      if (data.length < pageSize) break;
      fromSpare += pageSize;
    }

    const rowsToInsert = Object.values(perEmployee).map((entry) => {
      const names = nameCounts[entry.employee_id] ?? {};
      let selectedName: string | null = null;
      let maxCount = -1;
      for (const [name, count] of Object.entries(names)) {
        if (count > maxCount) {
          selectedName = name;
          maxCount = count;
        }
      }
      return {
        month_run_id: monthRunId,
        employee_id: entry.employee_id,
        driver_name: selectedName ?? 'not found',
        spare_usage_count: entry.count
      };
    });

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('spare_usage_driver_score_componant')
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
