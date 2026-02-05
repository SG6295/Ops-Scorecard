import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function parseMonthYear(month: string | null, year: string | null) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toISOString().slice(0, 10);
}

function extractEmpId(driverName: string | null) {
  if (!driverName) return null;
  const match = driverName.match(/^([^\-]+?)\s*-/);
  return match ? match[1].trim() : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthValue = parseMonthYear(searchParams.get('month'), searchParams.get('year'));
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

    const { data: scorecard, error: scoreError } = await supabaseAdmin
      .from('driver_scorecard')
      .select('*')
      .eq('month_run_id', monthRunId)
      .order('driver_score_total', { ascending: false });

    if (scoreError) {
      return NextResponse.json({ error: scoreError.message }, { status: 500 });
    }

    const drivers = (scorecard ?? []).map((row) => row.driver_name as string);
    const empIds = drivers.map(extractEmpId).filter((v): v is string => Boolean(v));

    const [fpdRes, spareRes, speedRes, mileageRes, incidentRes, cleaningRes] = await Promise.all([
      supabaseAdmin
        .from('fpd_driver_score_componant')
        .select('driver_name, number_of_login_trips_with_scheduled_start_time, percentage_of_fpds')
        .eq('month_run_id', monthRunId),
      supabaseAdmin
        .from('spare_usage_driver_score_componant')
        .select('driver_name, spare_usage_count')
        .eq('month_run_id', monthRunId),
      supabaseAdmin
        .from('speed_violations_driver_score_componant')
        .select('driver_name, speed_violations')
        .eq('month_run_id', monthRunId),
      supabaseAdmin
        .from('mileage_driver_score_componant')
        .select('driver_name, vehicle_number, average_mileage, variation, ideal_mileage, total_kms, total_diesel')
        .eq('month_run_id', monthRunId),
      empIds.length
        ? supabaseAdmin
            .from('incident_driver_score_componant')
            .select('emp_id, driver_incident_score')
            .eq('month_run_id', monthRunId)
            .in('emp_id', empIds)
        : Promise.resolve({ data: [], error: null }),
      empIds.length
        ? supabaseAdmin
            .from('cleaning_driver_score_componant')
            .select('emp_id, vehicle_exterior_score')
            .eq('month_run_id', monthRunId)
            .in('emp_id', empIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (fpdRes.error || spareRes.error || speedRes.error || mileageRes.error || incidentRes.error || cleaningRes.error) {
      return NextResponse.json({
        error:
          fpdRes.error?.message ||
          spareRes.error?.message ||
          speedRes.error?.message ||
          mileageRes.error?.message ||
          incidentRes.error?.message ||
          cleaningRes.error?.message ||
          'Failed to load components'
      }, { status: 500 });
    }

    const fpdMap = new Map((fpdRes.data ?? []).map((row) => [row.driver_name, row]));
    const spareMap = new Map((spareRes.data ?? []).map((row) => [row.driver_name, row]));
    const speedMap = new Map((speedRes.data ?? []).map((row) => [row.driver_name, row]));
    const mileageMap = new Map((mileageRes.data ?? []).map((row) => [row.driver_name, row]));
    const incidentMap = new Map((incidentRes.data ?? []).map((row) => [row.emp_id, row]));
    const cleaningMap = new Map((cleaningRes.data ?? []).map((row) => [row.emp_id, row]));

    const enriched = (scorecard ?? []).map((row) => {
      const driverName = row.driver_name as string;
      const empId = extractEmpId(driverName);
      return {
        ...row,
        components: {
          fpd: fpdMap.get(driverName) ?? null,
          spare: spareMap.get(driverName) ?? null,
          speed: speedMap.get(driverName) ?? null,
          mileage: mileageMap.get(driverName) ?? null,
          incident: empId ? incidentMap.get(empId) ?? null : null,
          cleaning: empId ? cleaningMap.get(empId) ?? null : null
        }
      };
    });

    return NextResponse.json({ month_run_id: monthRunId, data: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
