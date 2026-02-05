import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { columnMap, requiredOperationSummaryHeaders } from '@/lib/operationSummaryMapping';
import { cleaningColumnMap, requiredCleaningHeaders } from '@/lib/cleaningMapping';
import { dieselColumnMap, requiredDieselHeaders } from '@/lib/dieselMapping';
import { requiredIncidentHeaders, incidentColumnMap } from '@/lib/incidentMapping';
import { requiredSiteAmSupLoadMapHeaders, siteAmSupLoadMapColumnMap } from '@/lib/siteAmSupLoadMapMapping';
import { requiredSpareUtilizationHeaders, spareUtilizationColumnMap } from '@/lib/spareUtilizationMapping';
import {
  chunkArray,
  isSameMonthYear,
  normalizeValue,
  parseDateDDMonYYYY,
  parseDateDMY,
  parseNumber,
  parseNumberLoose
} from '@/lib/validation';

const REQUIRED_TABLE = 'operation_summary_report';

function extractSheetId(url: string) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function extractGid(url: string) {
  const match = url.match(/gid=([0-9]+)/);
  return match ? match[1] : null;
}

function buildCsvUrl(sheetUrl: string) {
  const id = extractSheetId(sheetUrl);
  if (!id) return null;
  const gid = extractGid(sheetUrl);
  const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  return gid ? `${base}&gid=${gid}` : base;
}

function normalizeHeader(header: string) {
  return header.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheetUrl = String(body.sheetUrl ?? '').trim();
    const spareSheetUrl = String(body.spareSheetUrl ?? '').trim();
    const cleaningSheetUrl = String(body.cleaningSheetUrl ?? '').trim();
    const incidentSheetUrl = String(body.incidentSheetUrl ?? '').trim();
    const dieselSheetUrl = String(body.dieselSheetUrl ?? '').trim();
    const siteLoadMapSheetUrl = String(body.siteLoadMapSheetUrl ?? '').trim();
    const month = Number(body.month);
    const year = Number(body.year);

    if (!sheetUrl) {
      return NextResponse.json({ error: 'Operation Summary sheet link is required.' }, { status: 400 });
    }

    if (!spareSheetUrl) {
      return NextResponse.json({ error: 'Spare Utilization sheet link is required.' }, { status: 400 });
    }

    if (!cleaningSheetUrl) {
      return NextResponse.json({ error: 'Cleaning sheet link is required.' }, { status: 400 });
    }

    if (!incidentSheetUrl) {
      return NextResponse.json({ error: 'Incident sheet link is required.' }, { status: 400 });
    }

    if (!dieselSheetUrl) {
      return NextResponse.json({ error: 'Diesel report sheet link is required.' }, { status: 400 });
    }

    if (!siteLoadMapSheetUrl) {
      return NextResponse.json({ error: 'Site AM/Sup load map sheet link is required.' }, { status: 400 });
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Month must be between 1 and 12.' }, { status: 400 });
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Year must be a four-digit year.' }, { status: 400 });
    }

    const csvUrl = buildCsvUrl(sheetUrl);
    if (!csvUrl) {
      return NextResponse.json({ error: 'Invalid Operation Summary Google Sheet link.' }, { status: 400 });
    }

    const spareCsvUrl = buildCsvUrl(spareSheetUrl);
    if (!spareCsvUrl) {
      return NextResponse.json({ error: 'Invalid Spare Utilization Google Sheet link.' }, { status: 400 });
    }

    const cleaningCsvUrl = buildCsvUrl(cleaningSheetUrl);
    if (!cleaningCsvUrl) {
      return NextResponse.json({ error: 'Invalid Cleaning Google Sheet link.' }, { status: 400 });
    }

    const incidentCsvUrl = buildCsvUrl(incidentSheetUrl);
    if (!incidentCsvUrl) {
      return NextResponse.json({ error: 'Invalid Incident Google Sheet link.' }, { status: 400 });
    }

    const dieselCsvUrl = buildCsvUrl(dieselSheetUrl);
    if (!dieselCsvUrl) {
      return NextResponse.json({ error: 'Invalid Diesel Report Google Sheet link.' }, { status: 400 });
    }

    const siteLoadMapCsvUrl = buildCsvUrl(siteLoadMapSheetUrl);
    if (!siteLoadMapCsvUrl) {
      return NextResponse.json({ error: 'Invalid Site AM/Sup load map Google Sheet link.' }, { status: 400 });
    }

    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      return NextResponse.json({ error: 'Unable to download the Operation Summary sheet as CSV. Make sure it is shared publicly.' }, { status: 400 });
    }

    const csvText = await csvResponse.text();
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    }) as Papa.ParseResult<Record<string, string>>;

    if (parsed.errors.length) {
      return NextResponse.json({ error: `CSV parse error: ${parsed.errors[0].message}` }, { status: 400 });
    }

    const headers = parsed.meta.fields?.map(normalizeHeader) ?? [];
    const missingHeaders = requiredOperationSummaryHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length) {
      return NextResponse.json({ error: `Missing required columns: ${missingHeaders.join(', ')}` }, { status: 400 });
    }

    const spareCsvResponse = await fetch(spareCsvUrl);
    if (!spareCsvResponse.ok) {
      return NextResponse.json({ error: 'Unable to download the Spare Utilization sheet as CSV. Make sure it is shared publicly.' }, { status: 400 });
    }

    const spareCsvText = await spareCsvResponse.text();
    const spareParsed = Papa.parse(spareCsvText, {
      header: true,
      skipEmptyLines: true
    }) as Papa.ParseResult<Record<string, string>>;

    if (spareParsed.errors.length) {
      return NextResponse.json({ error: `Spare CSV parse error: ${spareParsed.errors[0].message}` }, { status: 400 });
    }

    const spareHeaders = spareParsed.meta.fields?.map(normalizeHeader) ?? [];
    const spareMissingHeaders = requiredSpareUtilizationHeaders.filter((h) => !spareHeaders.includes(h));
    if (spareMissingHeaders.length) {
      return NextResponse.json({ error: `Spare Utilization missing columns: ${spareMissingHeaders.join(', ')}` }, { status: 400 });
    }

    const cleaningCsvResponse = await fetch(cleaningCsvUrl);
    if (!cleaningCsvResponse.ok) {
      return NextResponse.json({ error: 'Unable to download the Cleaning sheet as CSV. Make sure it is shared publicly.' }, { status: 400 });
    }

    const cleaningCsvText = await cleaningCsvResponse.text();
    const cleaningParsed = Papa.parse(cleaningCsvText, {
      header: true,
      skipEmptyLines: true
    }) as Papa.ParseResult<Record<string, string>>;

    if (cleaningParsed.errors.length) {
      return NextResponse.json({ error: `Cleaning CSV parse error: ${cleaningParsed.errors[0].message}` }, { status: 400 });
    }

    const cleaningHeaders = cleaningParsed.meta.fields?.map(normalizeHeader) ?? [];
    const cleaningMissingHeaders = requiredCleaningHeaders.filter((h) => !cleaningHeaders.includes(h));
    if (cleaningMissingHeaders.length) {
      return NextResponse.json({ error: `Cleaning missing columns: ${cleaningMissingHeaders.join(', ')}` }, { status: 400 });
    }

    const incidentCsvResponse = await fetch(incidentCsvUrl);
    if (!incidentCsvResponse.ok) {
      return NextResponse.json({ error: 'Unable to download the Incident sheet as CSV. Make sure it is shared publicly.' }, { status: 400 });
    }

    const incidentCsvText = await incidentCsvResponse.text();
    const incidentParsed = Papa.parse(incidentCsvText, {
      header: true,
      skipEmptyLines: true
    }) as Papa.ParseResult<Record<string, string>>;

    if (incidentParsed.errors.length) {
      return NextResponse.json({ error: `Incident CSV parse error: ${incidentParsed.errors[0].message}` }, { status: 400 });
    }

    const incidentHeaders = incidentParsed.meta.fields?.map(normalizeHeader) ?? [];
    const incidentMissingHeaders = requiredIncidentHeaders.filter((h) => !incidentHeaders.includes(h));
    if (incidentMissingHeaders.length) {
      return NextResponse.json({ error: `Incident missing columns: ${incidentMissingHeaders.join(', ')}` }, { status: 400 });
    }

    const dieselCsvResponse = await fetch(dieselCsvUrl);
    if (!dieselCsvResponse.ok) {
      return NextResponse.json({ error: 'Unable to download the Diesel Report sheet as CSV. Make sure it is shared publicly.' }, { status: 400 });
    }

    const dieselCsvText = await dieselCsvResponse.text();
    const dieselParsed = Papa.parse(dieselCsvText, {
      header: true,
      skipEmptyLines: true
    }) as Papa.ParseResult<Record<string, string>>;

    if (dieselParsed.errors.length) {
      return NextResponse.json({ error: `Diesel CSV parse error: ${dieselParsed.errors[0].message}` }, { status: 400 });
    }

    const dieselHeaders = dieselParsed.meta.fields?.map(normalizeHeader) ?? [];
    const dieselMissingHeaders = requiredDieselHeaders.filter((h) => !dieselHeaders.includes(h));
    if (dieselMissingHeaders.length) {
      return NextResponse.json({ error: `Diesel Report missing columns: ${dieselMissingHeaders.join(', ')}` }, { status: 400 });
    }

    const siteLoadMapCsvResponse = await fetch(siteLoadMapCsvUrl);
    if (!siteLoadMapCsvResponse.ok) {
      return NextResponse.json({ error: 'Unable to download the Site AM/Sup load map sheet as CSV. Make sure it is shared publicly.' }, { status: 400 });
    }

    const siteLoadMapCsvText = await siteLoadMapCsvResponse.text();
    const siteLoadMapParsed = Papa.parse(siteLoadMapCsvText, {
      header: true,
      skipEmptyLines: true
    }) as Papa.ParseResult<Record<string, string>>;

    if (siteLoadMapParsed.errors.length) {
      return NextResponse.json({ error: `Site AM/Sup load map CSV parse error: ${siteLoadMapParsed.errors[0].message}` }, { status: 400 });
    }

    const siteLoadMapHeaders = siteLoadMapParsed.meta.fields?.map(normalizeHeader) ?? [];
    const siteLoadMapMissingHeaders = requiredSiteAmSupLoadMapHeaders.filter((h) => !siteLoadMapHeaders.includes(h));
    if (siteLoadMapMissingHeaders.length) {
      return NextResponse.json({
        error: `Site AM/Sup load map missing columns: ${siteLoadMapMissingHeaders.join(', ')}`
      }, { status: 400 });
    }

    const rows = parsed.data.filter((row) => Object.values(row).some((value) => normalizeValue(value) !== null));
    const spareRows = spareParsed.data.filter((row) =>
      Object.values(row).some((value) => normalizeValue(value) !== null)
    );
    const cleaningRows = cleaningParsed.data.filter((row) =>
      Object.values(row).some((value) => normalizeValue(value) !== null)
    );
    const incidentRows = incidentParsed.data.filter((row) =>
      Object.values(row).some((value) => normalizeValue(value) !== null)
    );
    const dieselRows = dieselParsed.data.filter((row) =>
      Object.values(row).some((value) => normalizeValue(value) !== null)
    );
    const siteLoadMapRows = siteLoadMapParsed.data.filter((row) =>
      Object.values(row).some((value) => normalizeValue(value) !== null)
    );

    const tripIdSet = new Set<string>();
    const duplicates: string[] = [];
    const invalidDates: string[] = [];

    const preparedRows = rows.map((row, index) => {
      const tripId = normalizeValue(row['Trip ID']);
      if (!tripId) {
        duplicates.push(`Row ${index + 2}: missing Trip ID`);
      } else if (tripIdSet.has(tripId)) {
        duplicates.push(`Row ${index + 2}: duplicate Trip ID ${tripId}`);
      } else {
        tripIdSet.add(tripId);
      }

      const tripDateValue = normalizeValue(row['Trip Date']);
      const tripDate = parseDateDMY(tripDateValue ?? undefined);
      if (!tripDate || !isSameMonthYear(tripDate, month, year)) {
        invalidDates.push(`Row ${index + 2}: Trip Date ${tripDateValue ?? 'blank'} not in ${month}/${year}`);
      }

      const mapped: Record<string, string | number | null> = {
        trip_id: tripId,
        trip_date: tripDate ? tripDate.toISOString().slice(0, 10) : null
      };

      for (const [source, target] of Object.entries(columnMap)) {
        if (target === 'trip_id' || target === 'trip_date') continue;
        const value = row[source];
        if (
          [
            'vehicle_capacity',
            'expected_distance_km',
            'actual_distance_km',
            'first_last_point_visited_order',
            'dry_run_km',
            'schedule_stoppages',
            'skipped_stoppages',
            'speed_violation',
            'harsh_braking',
            'harsh_cornering',
            'harsh_acceleration',
            'scheduled_commuter',
            'confirm_commuter',
            'missed_commuter'
          ].includes(target)
        ) {
          mapped[target] = parseNumber(value);
        } else {
          mapped[target] = normalizeValue(value);
        }
      }

      return mapped;
    });

    const sparePreparedRows = spareRows.map((row, index) => {
      const requestDateValue = normalizeValue(row['Date']);
      const requestDate = parseDateDMY(requestDateValue ?? undefined);
      if (!requestDate || !isSameMonthYear(requestDate, month, year)) {
        invalidDates.push(`Spare Row ${index + 2}: Date ${requestDateValue ?? 'blank'} not in ${month}/${year}`);
      }

      const mapped: Record<string, string | number | null> = {
        request_date: requestDate ? requestDate.toISOString().slice(0, 10) : null
      };

      for (const [source, target] of Object.entries(spareUtilizationColumnMap)) {
        if (target === 'request_date') continue;
        const value = row[source];
        if (['requested_amount', 'approved_amount', 'debit_amount', 'pbc'].includes(target)) {
          mapped[target] = parseNumber(value);
        } else {
          mapped[target] = normalizeValue(value);
        }
      }

      return mapped;
    });

    const cleaningPreparedRows = cleaningRows.map((row, index) => {
      const empId = normalizeValue(row['Emp ID']);
      if (!empId) {
        duplicates.push(`Cleaning Row ${index + 2}: missing Emp ID`);
      }

      const mapped: Record<string, string | number | null> = {};
      for (const [source, target] of Object.entries(cleaningColumnMap)) {
        const value = row[source];
        if (target === 'vehicle_exterior_score') {
          mapped[target] = parseNumber(value);
        } else {
          mapped[target] = normalizeValue(value);
        }
      }
      return mapped;
    });

    const incidentPreparedRows = incidentRows.map((row, index) => {
      const empId = normalizeValue(row['Emp ID']);
      if (!empId) {
        duplicates.push(`Incident Row ${index + 2}: missing Emp ID`);
      }

      const mapped: Record<string, string | number | null> = {};
      for (const [source, target] of Object.entries(incidentColumnMap)) {
        const value = row[source];
        if (target === 'driver_incident_score') {
          mapped[target] = parseNumber(value);
        } else {
          mapped[target] = normalizeValue(value);
        }
      }
      return mapped;
    });

    const dieselPreparedRows = dieselRows.map((row, index) => {
      const vehicleNumber = normalizeValue(row['Vehicle Number']);
      if (!vehicleNumber) {
        duplicates.push(`Diesel Row ${index + 2}: missing Vehicle Number`);
      }

      const lastFilingValue = normalizeValue(row['Last Filing Date']);
      const lastFilingDate = lastFilingValue ? parseDateDDMonYYYY(lastFilingValue) : null;
      if (lastFilingValue && (!lastFilingDate || !isSameMonthYear(lastFilingDate, month, year))) {
        invalidDates.push(`Diesel Row ${index + 2}: Last Filing Date ${lastFilingValue} not in ${month}/${year}`);
      }

      const mapped: Record<string, string | number | null> = {
        last_filing_date: lastFilingDate ? lastFilingDate.toISOString().slice(0, 10) : null
      };

      for (const [source, target] of Object.entries(dieselColumnMap)) {
        if (target === 'last_filing_date') continue;
        const value = row[source];
        if (
          [
            'first_filing_km',
            'last_filling_km',
            'total_km',
            'diesel_in_litres',
            'amount',
            'mileage',
            'ideal_mileage',
            'difference',
            'diff_pct',
            'deductions'
          ].includes(target)
        ) {
          mapped[target] = parseNumberLoose(value);
        } else {
          mapped[target] = normalizeValue(value);
        }
      }

      return mapped;
    });

    const siteLoadMapPreparedRows = siteLoadMapRows.map((row, index) => {
      const siteValue = normalizeValue(row['Sites']);
      if (!siteValue) {
        duplicates.push(`Site Load Map Row ${index + 2}: missing Site`);
      }

      const mapped: Record<string, string | number | null> = {};
      for (const [source, target] of Object.entries(siteAmSupLoadMapColumnMap)) {
        const value = row[source];
        if (
          [
            'actual_no_of_own_vehicles',
            'actual_no_of_drivers',
            'actual_no_of_attendars',
            'actual_no_of_units'
          ].includes(target)
        ) {
          mapped[target] = parseNumberLoose(value);
        } else {
          mapped[target] = normalizeValue(value);
        }
      }
      return mapped;
    });

    if (duplicates.length) {
      return NextResponse.json({ error: `Trip ID issues:\n${duplicates.slice(0, 10).join('\n')}` }, { status: 400 });
    }

    if (invalidDates.length) {
      return NextResponse.json({ error: `Trip Date issues:\n${invalidDates.slice(0, 10).join('\n')}` }, { status: 400 });
    }

    const monthDate = new Date(Date.UTC(year, month - 1, 1));
    const monthValue = monthDate.toISOString().slice(0, 10);

    const { data: existingRuns, error: monthRunError } = await supabaseAdmin
      .from('month_runs')
      .select('id')
      .eq('month', monthValue)
      .limit(1);

    if (monthRunError) {
      return NextResponse.json({ error: `Failed to check month_runs: ${monthRunError.message}` }, { status: 500 });
    }

    let monthRunId = existingRuns?.[0]?.id as string | undefined;

    if (!monthRunId) {
      monthRunId = crypto.randomUUID();
      const { error: insertMonthError } = await supabaseAdmin.from('month_runs').insert({
        id: monthRunId,
        month: monthValue,
        status: 'raw_loaded'
      });
      if (insertMonthError) {
        return NextResponse.json({ error: `Failed to create month run: ${insertMonthError.message}` }, { status: 500 });
      }
    }

    // Clear existing data for this month_run_id before importing
    const tablesToClear = [
      'operation_summary_report',
      'spare_utilization_report',
      'cleaning_driver_score_componant',
      'incident_driver_score_componant',
      'diesel_report',
      'site_am_sup_load_map',
      'fpd_driver_score_componant',
      'spare_usage_driver_score_componant',
      'speed_violations_driver_score_componant',
      'mileage_driver_score_componant',
      'driver_scorecard'
    ];

    for (const table of tablesToClear) {
      const { error: clearError } = await supabaseAdmin.from(table).delete().eq('month_run_id', monthRunId);
      if (clearError) {
        return NextResponse.json({ error: `Failed to clear ${table}: ${clearError.message}` }, { status: 500 });
      }
    }

    const withMonth = preparedRows.map((row) => ({
      month_run_id: monthRunId,
      ...row
    }));

    const spareWithMonth = sparePreparedRows.map((row) => ({
      month_run_id: monthRunId,
      ...row
    }));

    const cleaningWithMonth = cleaningPreparedRows.map((row) => ({
      month_run_id: monthRunId,
      ...row
    }));

    const incidentWithMonth = incidentPreparedRows.map((row) => ({
      month_run_id: monthRunId,
      ...row
    }));

    const dieselWithMonth = dieselPreparedRows.map((row) => ({
      month_run_id: monthRunId,
      ...row
    }));

    const siteLoadMapWithMonth = siteLoadMapPreparedRows.map((row) => ({
      month_run_id: monthRunId,
      ...row
    }));

    let inserted = 0;
    const chunks = chunkArray(withMonth, 500);

    for (const chunk of chunks) {
      const { error: insertError } = await supabaseAdmin.from(REQUIRED_TABLE).insert(chunk, {
        defaultToNull: true
      });
      if (insertError) {
        return NextResponse.json({ error: `Failed to insert rows: ${insertError.message}` }, { status: 500 });
      }
      inserted += chunk.length;
    }

    let spareInserted = 0;
    const spareChunks = chunkArray(spareWithMonth, 500);
    for (const chunk of spareChunks) {
      const { error: insertError } = await supabaseAdmin.from('spare_utilization_report').insert(chunk, {
        defaultToNull: true
      });
      if (insertError) {
        return NextResponse.json({ error: `Failed to insert spare rows: ${insertError.message}` }, { status: 500 });
      }
      spareInserted += chunk.length;
    }

    let cleaningInserted = 0;
    const cleaningChunks = chunkArray(cleaningWithMonth, 500);
    for (const chunk of cleaningChunks) {
      const { error: insertError } = await supabaseAdmin.from('cleaning_driver_score_componant').insert(chunk, {
        defaultToNull: true
      });
      if (insertError) {
        return NextResponse.json({ error: `Failed to insert cleaning rows: ${insertError.message}` }, { status: 500 });
      }
      cleaningInserted += chunk.length;
    }

    let incidentInserted = 0;
    const incidentChunks = chunkArray(incidentWithMonth, 500);
    for (const chunk of incidentChunks) {
      const { error: insertError } = await supabaseAdmin.from('incident_driver_score_componant').insert(chunk, {
        defaultToNull: true
      });
      if (insertError) {
        return NextResponse.json({ error: `Failed to insert incident rows: ${insertError.message}` }, { status: 500 });
      }
      incidentInserted += chunk.length;
    }

    let dieselInserted = 0;
    const dieselChunks = chunkArray(dieselWithMonth, 500);
    for (const chunk of dieselChunks) {
      const { error: insertError } = await supabaseAdmin.from('diesel_report').insert(chunk, {
        defaultToNull: true
      });
      if (insertError) {
        return NextResponse.json({ error: `Failed to insert diesel rows: ${insertError.message}` }, { status: 500 });
      }
      dieselInserted += chunk.length;
    }

    let siteLoadMapInserted = 0;
    const siteLoadMapChunks = chunkArray(siteLoadMapWithMonth, 500);
    for (const chunk of siteLoadMapChunks) {
      const { error: insertError } = await supabaseAdmin.from('site_am_sup_load_map').insert(chunk, {
        defaultToNull: true
      });
      if (insertError) {
        return NextResponse.json({ error: `Failed to insert site load map rows: ${insertError.message}` }, { status: 500 });
      }
      siteLoadMapInserted += chunk.length;
    }

    await supabaseAdmin.from('month_runs').update({ status: 'raw_loaded' }).eq('id', monthRunId);

    const functionKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const functionBase = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
      : '';

    let fpdResult: { rows_inserted?: number; error?: string } | null = null;
    let spareUsageResult: { rows_inserted?: number; error?: string } | null = null;
    let speedViolationsResult: { rows_inserted?: number; error?: string } | null = null;
    let mileageResult: { rows_inserted?: number; error?: string } | null = null;
    let driverScorecardResult: { rows_inserted?: number; error?: string } | null = null;

    const callFunction = async (name: string) => {
      if (!functionBase || !functionKey) return { error: `${name} not configured` } as const;
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
      return response.ok ? data : { error: data.error ?? `${name} failed` };
    };

    fpdResult = await callFunction('FPD_driver_score_componant_logic');
    spareUsageResult = await callFunction('spare_usage_driver_score_componant_logic');
    speedViolationsResult = await callFunction('speed_violations_driver_score_componant_logic');
    mileageResult = await callFunction('mileage_driver_score_componant_logic');
    driverScorecardResult = await callFunction('driver_score_card_logic');

    return NextResponse.json({
      inserted,
      month_run_id: monthRunId,
      rows_in_file: rows.length,
      spare_rows_in_file: spareRows.length,
      spare_inserted: spareInserted,
      cleaning_rows_in_file: cleaningRows.length,
      cleaning_inserted: cleaningInserted,
      incident_rows_in_file: incidentRows.length,
      incident_inserted: incidentInserted,
      diesel_rows_in_file: dieselRows.length,
      diesel_inserted: dieselInserted,
      site_load_map_rows_in_file: siteLoadMapRows.length,
      site_load_map_inserted: siteLoadMapInserted,
      fpd_component: fpdResult,
      spare_usage_component: spareUsageResult,
      speed_violations_component: speedViolationsResult,
      mileage_component: mileageResult,
      driver_scorecard_component: driverScorecardResult
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
