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

function scoreFpd(value: number | null) {
  if (value === null) return null;
  const pct = value <= 1 ? value * 100 : value;
  if (pct <= 9) return 20;
  if (pct <= 15) return 10;
  return 0;
}

function scoreSpare(count: number | null) {
  if (count === null) return null;
  if (count <= 2) return 20;
  if (count <= 4) return 10;
  return 0;
}

function scoreSpeed(count: number | null) {
  if (count === null) return null;
  if (count <= 4) return 20;
  if (count <= 9) return 10;
  return 0;
}

function scoreIncident(value: number | null) {
  if (value === null) return null;
  if (value === 3) return 20;
  if (value === 2) return 10;
  return 0;
}

function scoreCleaning(value: number | null) {
  if (value === null) return null;
  if (value === 3) return 10;
  if (value === 2) return 5;
  return 0;
}

function scoreMileage(variation: string | null) {
  if (!variation) return null;
  if (variation === 'Positive') return 10;
  const match = variation.match(/([0-9.]+)%/);
  if (match) {
    const pct = Number(match[1]);
    if (!Number.isNaN(pct) && pct <= 5) return 10;
  }
  return 0;
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
      .from('driver_scorecard')
      .delete()
      .eq('month_run_id', monthRunId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    const baseDrivers: Record<string, { fpd_pct: number | null }> = {};
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('fpd_driver_score_componant')
        .select('driver_name, number_of_login_trips_with_scheduled_start_time, percentage_of_fpds')
        .eq('month_run_id', monthRunId)
        .range(from, from + pageSize - 1);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      if (!data || data.length === 0) break;

      for (const row of data) {
        const driver = row.driver_name?.toString().trim();
        const trips = parseNumber(row.number_of_login_trips_with_scheduled_start_time) ?? 0;
        if (!driver || trips <= 4) continue;
        baseDrivers[driver] = { fpd_pct: parseNumber(row.percentage_of_fpds) };
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    const driverNames = Object.keys(baseDrivers);

    const empIdMap: Record<string, string> = {};
    const corpNameCounts: Record<string, Record<string, number>> = {};

    if (driverNames.length > 0) {
      let fromOps = 0;
      const opsPageSize = 1000;
      const prefixRegex = /^([^\-]+?)\s*-/;
      while (true) {
        const { data, error } = await supabase
          .from('operation_summary_report')
          .select('driver_name, corp_name')
          .eq('month_run_id', monthRunId)
          .range(fromOps, fromOps + opsPageSize - 1);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        if (!data || data.length === 0) break;

        for (const row of data) {
          const driverName = row.driver_name?.toString().trim();
          if (!driverName || !baseDrivers[driverName]) continue;

          const match = driverName.match(prefixRegex);
          if (match && !empIdMap[driverName]) {
            empIdMap[driverName] = match[1].trim();
          }

          const corp = row.corp_name?.toString().trim();
          if (!corp) continue;
          if (!corpNameCounts[driverName]) corpNameCounts[driverName] = {};
          corpNameCounts[driverName][corp] = (corpNameCounts[driverName][corp] ?? 0) + 1;
        }

        if (data.length < opsPageSize) break;
        fromOps += opsPageSize;
      }
    }

    const siteLookup: Record<string, { manager: string | null; supervisor: string | null }> = {};
    if (Object.keys(corpNameCounts).length > 0) {
      let fromSite = 0;
      const sitePageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('site_am_sup_load_map')
          .select('site, manager, supervisor')
          .eq('month_run_id', monthRunId)
          .range(fromSite, fromSite + sitePageSize - 1);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        if (!data || data.length === 0) break;
        for (const row of data) {
          const site = row.site?.toString().trim();
          if (!site) continue;
          siteLookup[site] = {
            manager: row.manager?.toString().trim() ?? null,
            supervisor: row.supervisor?.toString().trim() ?? null
          };
        }

        if (data.length < sitePageSize) break;
        fromSite += sitePageSize;
      }
    }

    const spareUsageMap: Record<string, number | null> = {};
    let fromSpare = 0;
    while (true) {
      const { data, error } = await supabase
        .from('spare_usage_driver_score_componant')
        .select('employee_id, spare_usage_count')
        .eq('month_run_id', monthRunId)
        .range(fromSpare, fromSpare + pageSize - 1);

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      if (!data || data.length === 0) break;
      for (const row of data) {
        const employeeId = row.employee_id?.toString().trim();
        if (!employeeId) continue;
        spareUsageMap[employeeId] = parseNumber(row.spare_usage_count);
      }
      if (data.length < pageSize) break;
      fromSpare += pageSize;
    }

    const speedMap: Record<string, number | null> = {};
    let fromSpeed = 0;
    while (true) {
      const { data, error } = await supabase
        .from('speed_violations_driver_score_componant')
        .select('driver_name, speed_violations')
        .eq('month_run_id', monthRunId)
        .range(fromSpeed, fromSpeed + pageSize - 1);

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      if (!data || data.length === 0) break;
      for (const row of data) {
        const driver = row.driver_name?.toString().trim();
        if (!driver) continue;
        speedMap[driver] = parseNumber(row.speed_violations);
      }
      if (data.length < pageSize) break;
      fromSpeed += pageSize;
    }

    const incidentMap: Record<string, number | null> = {};
    let fromIncident = 0;
    while (true) {
      const { data, error } = await supabase
        .from('incident_driver_score_componant')
        .select('emp_id, driver_incident_score')
        .eq('month_run_id', monthRunId)
        .range(fromIncident, fromIncident + pageSize - 1);

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      if (!data || data.length === 0) break;
      for (const row of data) {
        const empId = row.emp_id?.toString().trim();
        if (!empId) continue;
        incidentMap[empId] = parseNumber(row.driver_incident_score);
      }
      if (data.length < pageSize) break;
      fromIncident += pageSize;
    }

    const cleaningMap: Record<string, number | null> = {};
    let fromCleaning = 0;
    while (true) {
      const { data, error } = await supabase
        .from('cleaning_driver_score_componant')
        .select('emp_id, vehicle_exterior_score')
        .eq('month_run_id', monthRunId)
        .range(fromCleaning, fromCleaning + pageSize - 1);

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      if (!data || data.length === 0) break;
      for (const row of data) {
        const empId = row.emp_id?.toString().trim();
        if (!empId) continue;
        cleaningMap[empId] = parseNumber(row.vehicle_exterior_score);
      }
      if (data.length < pageSize) break;
      fromCleaning += pageSize;
    }

    const mileageMap: Record<string, string | null> = {};
    let fromMileage = 0;
    while (true) {
      const { data, error } = await supabase
        .from('mileage_driver_score_componant')
        .select('driver_name, variation')
        .eq('month_run_id', monthRunId)
        .range(fromMileage, fromMileage + pageSize - 1);

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      if (!data || data.length === 0) break;
      for (const row of data) {
        const driver = row.driver_name?.toString().trim();
        if (!driver) continue;
        mileageMap[driver] = row.variation?.toString().trim() ?? null;
      }
      if (data.length < pageSize) break;
      fromMileage += pageSize;
    }

    const rowsToInsert = driverNames.map((driver) => {
      const corpCounts = corpNameCounts[driver] ?? {};
      let siteName: string | null = null;
      let maxCount = -1;
      for (const [corp, count] of Object.entries(corpCounts)) {
        if (count > maxCount) {
          siteName = corp;
          maxCount = count;
        }
      }

      const siteInfo = siteName ? siteLookup[siteName] : null;
      const empId = empIdMap[driver] ?? null;

      const fpdScore = scoreFpd(baseDrivers[driver]?.fpd_pct ?? null);
      const spareScore = scoreSpare(empId ? spareUsageMap[empId] ?? null : null);
      const speedScore = scoreSpeed(speedMap[driver] ?? null);
      const incidentScore = scoreIncident(empId ? incidentMap[empId] ?? null : null);
      const cleaningScore = scoreCleaning(empId ? cleaningMap[empId] ?? null : null);
      const mileageScore = scoreMileage(mileageMap[driver] ?? null);
      const total =
        (fpdScore ?? 0) +
        (spareScore ?? 0) +
        (speedScore ?? 0) +
        (incidentScore ?? 0) +
        (mileageScore ?? 0) +
        (cleaningScore ?? 0);

      return {
        month_run_id: monthRunId,
        driver_name: driver,
        site_name: siteName,
        manager: siteInfo?.manager ?? null,
        supervisor: siteInfo?.supervisor ?? null,
        fpd_score: fpdScore,
        spare_usage_score: spareScore,
        speed_violation_score: speedScore,
        incident_score: incidentScore,
        mileage_score: mileageScore,
        cleaning_score: cleaningScore,
        driver_score_total: total
      };
    });

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('driver_scorecard')
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
