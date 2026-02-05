import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type RequestPayload = {
  month_run_id: string;
};

const nullLikes = new Set(['', 'NA', 'N/A', 'N.A.', '-', 'null', 'NULL']);

function isScheduledTimeValid(value: string | null) {
  if (value === null) return false;
  const trimmed = value.trim();
  return !nullLikes.has(trimmed);
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
      .from('fpd_driver_score_componant')
      .delete()
      .eq('month_run_id', monthRunId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    const perDriver: Record<
      string,
      {
        driver_name: string;
        login: number;
        fps: number;
        fpd_order_mismatch: number;
        fpd: number;
      }
    > = {};

    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('operation_summary_report')
        .select('driver_name, trip_type, scheduled_start_end_time, first_point_visit')
        .eq('month_run_id', monthRunId)
        .eq('trip_type', 'Login')
        .range(from, from + pageSize - 1);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      if (!data || data.length === 0) break;

      for (const row of data) {
        const driverName = row.driver_name?.toString().trim();
        if (!driverName) continue;
        if (!isScheduledTimeValid(row.scheduled_start_end_time)) continue;

        if (!perDriver[driverName]) {
          perDriver[driverName] = {
            driver_name: driverName,
            login: 0,
            fps: 0,
            fpd_order_mismatch: 0,
            fpd: 0
          };
        }

        const record = perDriver[driverName];
        record.login += 1;

        const visit = row.first_point_visit?.toString().trim();
        if (visit === 'Skip') record.fps += 1;
        if (visit === 'Late(Order Mismatch)') record.fpd_order_mismatch += 1;
        if (visit === 'Late') record.fpd += 1;
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    const rowsToInsert = Object.values(perDriver).map((record) => {
      const totalFpd = record.fps + record.fpd_order_mismatch + record.fpd;
      const percentage = record.login > 0 ? totalFpd / record.login : 0;
      return {
        month_run_id: monthRunId,
        driver_name: record.driver_name,
        number_of_login_trips_with_scheduled_start_time: record.login,
        number_of_fps: record.fps,
        number_of_fpd_w_order_mismatch: record.fpd_order_mismatch,
        number_of_fpds: record.fpd,
        percentage_of_fpds: percentage
      };
    });

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('fpd_driver_score_componant')
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
