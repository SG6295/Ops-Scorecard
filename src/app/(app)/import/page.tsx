'use client';

import { useMemo, useState } from 'react';

const currentYear = new Date().getFullYear();

export default function ImportPage() {
  const [sheetUrl, setSheetUrl] = useState('');
  const [spareSheetUrl, setSpareSheetUrl] = useState('');
  const [cleaningSheetUrl, setCleaningSheetUrl] = useState('');
  const [incidentSheetUrl, setIncidentSheetUrl] = useState('');
  const [dieselSheetUrl, setDieselSheetUrl] = useState('');
  const [siteLoadMapSheetUrl, setSiteLoadMapSheetUrl] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(currentYear));
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const yearOptions = useMemo(() => {
    const list = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y += 1) {
      list.push(String(y));
    }
    return list;
  }, []);

  const handleUpload = async () => {
    const confirmed = window.confirm(
      'Are you sure? This will delete all existing data for the selected month before importing.'
    );
    if (!confirmed) return;
    setLoading(true);
    setStatus('Validating and importing...');
    try {
      const response = await fetch('/api/import-operation-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl,
          spareSheetUrl,
          cleaningSheetUrl,
          incidentSheetUrl,
          dieselSheetUrl,
          siteLoadMapSheetUrl,
          month: Number(month),
          year: Number(year)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setStatus(`Import failed: ${data.error ?? 'Unknown error'}`);
      } else {
        const lines = [
          `Imported ${data.inserted} rows (from ${data.rows_in_file}).`,
          `month_run_id: ${data.month_run_id}`
        ];

        if (data.fpd_component?.error) lines.push(`FPD component error: ${data.fpd_component.error}`);
        if (data.spare_usage_component?.error)
          lines.push(`Spare usage component error: ${data.spare_usage_component.error}`);
        if (data.speed_violations_component?.error)
          lines.push(`Speed violations component error: ${data.speed_violations_component.error}`);
        if (data.mileage_component?.error)
          lines.push(`Mileage component error: ${data.mileage_component.error}`);
        if (data.driver_scorecard_component?.error)
          lines.push(`Driver scorecard error: ${data.driver_scorecard_component.error}`);

        setStatus(lines.join('\n'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.';
      setStatus(`Import failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="card hero">
        <span className="tag">Layer 1 · Raw Facts</span>
        <h1>Data Import</h1>
        <p className="sub">Paste each Google Sheet link, select the month and year, and import raw data.</p>
      </div>

      <div className="card">
        <div className="form-field">
          <label>Operation Summary report</label>
          <input
            value={sheetUrl}
            onChange={(event) => setSheetUrl(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>
        <div className="form-field">
          <label>Spare Utilization report</label>
          <input
            value={spareSheetUrl}
            onChange={(event) => setSpareSheetUrl(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>
        <div className="form-field">
          <label>Cleaning report</label>
          <input
            value={cleaningSheetUrl}
            onChange={(event) => setCleaningSheetUrl(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>
        <div className="form-field">
          <label>Incident report</label>
          <input
            value={incidentSheetUrl}
            onChange={(event) => setIncidentSheetUrl(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>
        <div className="form-field">
          <label>Diesel report</label>
          <input
            value={dieselSheetUrl}
            onChange={(event) => setDieselSheetUrl(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>
        <div className="form-field">
          <label>Site AM/Sup load map</label>
          <input
            value={siteLoadMapSheetUrl}
            onChange={(event) => setSiteLoadMapSheetUrl(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>
        <div className="form-field">
          <label>Month</label>
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>
        <div className="form-field">
          <label>Year</label>
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            {yearOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <button onClick={handleUpload} disabled={loading}>
          {loading ? 'Uploading...' : 'Upload & Import'}
        </button>

        {status ? <div className="status">{status}</div> : null}
      </div>
    </>
  );
}
