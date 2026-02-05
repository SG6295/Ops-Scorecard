import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

function parseMonthYear(month: number, year: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const month = Number(body.month);
    const year = Number(body.year);
    const monthValue = parseMonthYear(month, year);
    if (!monthValue) {
      return NextResponse.json({ error: 'Invalid month/year' }, { status: 400 });
    }

    const { data: monthRuns, error: monthError } = await supabaseAdmin
      .from('month_runs')
      .select('id')
      .eq('month', monthValue)
      .limit(1);

    if (monthError) {
      return NextResponse.json({ error: monthError.message }, { status: 500 });
    }

    const monthRunId = monthRuns?.[0]?.id as string | undefined;
    if (!monthRunId) {
      return NextResponse.json({ error: 'Month run not found' }, { status: 404 });
    }

    const functionBase = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
      : '';
    const functionKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

    if (!functionBase || !functionKey) {
      return NextResponse.json({ error: 'Supabase function URL/key not configured' }, { status: 500 });
    }

    const callFunction = async (name: string) => {
      const response = await fetch(`${functionBase}/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${functionKey}`,
          apikey: functionKey
        },
        body: JSON.stringify({ month_run_id: monthRunId })
      });
      const data = await response.json();
      return response.ok ? { ok: true, data } : { ok: false, error: data.error ?? `${name} failed` };
    };

    const results: Record<string, unknown> = {};
    for (const name of [
      'FPD_driver_score_componant_logic',
      'spare_usage_driver_score_componant_logic',
      'speed_violations_driver_score_componant_logic',
      'mileage_driver_score_componant_logic',
      'driver_score_card_logic'
    ]) {
      const result = await callFunction(name);
      results[name] = result;
      if (!result.ok) {
        return NextResponse.json({ error: (result as { error: string }).error }, { status: 500 });
      }
    }

    return NextResponse.json({ month_run_id: monthRunId, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
