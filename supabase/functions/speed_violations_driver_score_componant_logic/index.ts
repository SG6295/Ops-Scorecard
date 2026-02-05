import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type RequestPayload = {
  month_run_id: string;
};

const nullLikes = new Set(['', 'NA', 'N/A', 'N.A.', '-', 'null', 'NULL']);

function parseNumber(value: string | null) {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (nullLikes.has(trimmed)) return null;
  const num = Number(trimmed);
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
      .from('speed_violations_driver_score_componant')
      .delete()
      .eq('month_run_id', monthRunId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    const perDriver: Record<string, { driver_name: string; total: number }> = {};

    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('operation_summary_report')
        .select('driver_name, speed_violation')
        .eq('month_run_id', monthRunId)
        .range(from, from + pageSize - 1);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      if (!data || data.length === 0) break;

      for (const row of data) {
        const driverName = row.driver_name?.toString().trim();
        if (!driverName) continue;
        const val = parseNumber(row.speed_violation?.toString() ?? null) ?? 0;

        if (!perDriver[driverName]) {
          perDriver[driverName] = { driver_name: driverName, total: 0 };
        }
        perDriver[driverName].total += val;
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    const rowsToInsert = Object.values(perDriver).map((record) => ({
      month_run_id: monthRunId,
      driver_name: record.driver_name,
      speed_violations: record.total
    }));

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('speed_violations_driver_score_componant')
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
