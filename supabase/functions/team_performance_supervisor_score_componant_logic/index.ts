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

function normalizeSupervisor(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text ? text : 'Unknown';
}

function roundTo2(value: number) {
  return Math.round(value * 100) / 100;
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
      .from('team_performance_supervisor_score_componant')
      .delete()
      .eq('month_run_id', monthRunId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    const pageSize = 1000;
    let from = 0;

    const aggregates: Record<string, { sum: number; count: number }> = {};

    while (true) {
      const { data, error } = await supabase
        .from('driver_scorecard')
        .select('supervisor, driver_score_total')
        .eq('month_run_id', monthRunId)
        .range(from, from + pageSize - 1);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      if (!data || data.length === 0) break;

      for (const row of data) {
        const supervisor = normalizeSupervisor(row.supervisor);
        const score = parseNumber(row.driver_score_total) ?? 0;
        if (!aggregates[supervisor]) {
          aggregates[supervisor] = { sum: 0, count: 0 };
        }
        aggregates[supervisor].sum += score;
        aggregates[supervisor].count += 1;
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    const rowsToInsert = Object.entries(aggregates).map(([supervisor, stats]) => {
      const avg = stats.count > 0 ? stats.sum / stats.count : 0;
      return {
        month_run_id: monthRunId,
        supervisor_name: supervisor,
        average_driver_score: roundTo2(avg)
      };
    });

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('team_performance_supervisor_score_componant')
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
