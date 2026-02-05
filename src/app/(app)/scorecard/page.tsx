'use client';

import { useMemo, useState } from 'react';

const currentYear = new Date().getFullYear();

type ScoreRow = {
  driver_name: string;
  site_name: string | null;
  manager: string | null;
  supervisor: string | null;
  fpd_score: number | null;
  spare_usage_score: number | null;
  speed_violation_score: number | null;
  incident_score: number | null;
  mileage_score: number | null;
  cleaning_score: number | null;
  driver_score_total: number | null;
  components: {
    fpd: { number_of_login_trips_with_scheduled_start_time: number | null; percentage_of_fpds: number | null } | null;
    spare: { spare_usage_count: number | null } | null;
    speed: { speed_violations: number | null } | null;
    mileage:
      | {
          vehicle_number: string | null;
          average_mileage: string | null;
          variation: string | null;
          ideal_mileage: number | null;
          total_kms: number | null;
          total_diesel: number | null;
        }
      | null;
    incident: { driver_incident_score: number | null } | null;
    cleaning: { vehicle_exterior_score: number | null } | null;
  };
};

export default function ScorecardPage() {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(currentYear));
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [valueSearch, setValueSearch] = useState('');
  const [valueFilters, setValueFilters] = useState<Record<string, string[]>>({});
  const [sortKey, setSortKey] = useState('driver_score_total');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const yearOptions = useMemo(() => {
    const list = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y += 1) {
      list.push(String(y));
    }
    return list;
  }, []);

  const handleLoad = async () => {
    setLoading(true);
    setStatus('Loading scorecard...');
    try {
      const res = await fetch(`/api/driver-scorecard?month=${month}&year=${year}`);
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Failed: ${data.error ?? 'Unknown error'}`);
        setRows([]);
      } else {
        setRows(data.data ?? []);
        setStatus(`Loaded ${data.data?.length ?? 0} drivers.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setStatus(`Failed: ${message}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setLoading(true);
    setStatus('Recalculating scorecard...');
    try {
      const monthValue = Number(month);
      const yearValue = Number(year);
      const res = await fetch('/api/recalculate-scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: monthValue, year: yearValue })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Failed: ${data.error ?? 'Unknown error'}`);
      } else {
        setStatus(`Recalculated ${data.rows_inserted ?? 0} drivers.`);
        await handleLoad();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setStatus(`Failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (driver: string) => {
    setExpanded((prev) => ({ ...prev, [driver]: !prev[driver] }));
  };

  const columns = [
    { key: 'driver_name', label: 'Driver' },
    { key: 'site_name', label: 'Site' },
    { key: 'manager', label: 'Manager' },
    { key: 'supervisor', label: 'Supervisor' },
    { key: 'driver_score_total', label: 'Total' },
    { key: 'fpd_score', label: 'FPD' },
    { key: 'spare_usage_score', label: 'Spare' },
    { key: 'speed_violation_score', label: 'Speed' },
    { key: 'incident_score', label: 'Incident' },
    { key: 'mileage_score', label: 'Mileage' },
    { key: 'cleaning_score', label: 'Cleaning' }
  ];

  const getValue = (row: ScoreRow, key: string) => {
    const value = (row as Record<string, unknown>)[key];
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };

  const uniqueValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of columns) {
      const set = new Set<string>();
      rows.forEach((row) => set.add(getValue(row, col.key)));
      map[col.key] = Array.from(set).sort();
    }
    return map;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      for (const [key, selected] of Object.entries(valueFilters)) {
        if (!selected || selected.length === 0) continue;
        const value = getValue(row, key);
        if (!selected.includes(value)) return false;
      }
      return true;
    });
  }, [rows, valueFilters]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
      }
      const aText = (aVal ?? '').toString();
      const bText = (bVal ?? '').toString();
      return sortDir === 'desc' ? bText.localeCompare(aText) : aText.localeCompare(bText);
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const handleDownload = () => {
    const headers = [
      'Driver Name',
      'Site Name',
      'Manager',
      'Supervisor',
      'Total Score',
      'FPD Score',
      'Spare Usage Score',
      'Speed Violation Score',
      'Incident Score',
      'Mileage Score',
      'Cleaning Score'
    ];

    const escapeValue = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const lines = [
      headers.join(','),
      ...sortedRows.map((row) =>
        [
          row.driver_name,
          row.site_name ?? '',
          row.manager ?? '',
          row.supervisor ?? '',
          row.driver_score_total ?? '',
          row.fpd_score ?? '',
          row.spare_usage_score ?? '',
          row.speed_violation_score ?? '',
          row.incident_score ?? '',
          row.mileage_score ?? '',
          row.cleaning_score ?? ''
        ]
          .map(escapeValue)
          .join(',')
      )
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `driver_scorecard_${month}_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const toggleValue = (key: string, value: string) => {
    setValueFilters((prev) => {
      const existing = new Set(prev[key] ?? []);
      if (existing.has(value)) {
        existing.delete(value);
      } else {
        existing.add(value);
      }
      return { ...prev, [key]: Array.from(existing) };
    });
  };

  const clearFilter = (key: string) => {
    setValueFilters((prev) => ({ ...prev, [key]: [] }));
  };

  const filteredValues = (key: string) => {
    const values = uniqueValues[key] ?? [];
    const q = valueSearch.trim().toLowerCase();
    const filtered = q ? values.filter((v) => v.toLowerCase().includes(q)) : values;
    return filtered.slice(0, 50);
  };

  return (
    <div className="table-wrap">
      <div className="table-header">
        <div>
          <div className="table-title">Driver Scorecard</div>
          <div className="footer-note">Showing {sortedRows.length} drivers</div>
        </div>
        <div className="table-controls">
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
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            {yearOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button onClick={handleLoad} disabled={loading}>
            {loading ? 'Loading...' : 'Load'}
          </button>
          <button className="secondary" onClick={handleRecalculate} disabled={loading}>
            Recalculate
          </button>
          <button className="secondary" onClick={handleDownload}>
            Download CSV
          </button>
          <button className="secondary" onClick={() => setExpanded({})}>
            Collapse All
          </button>
        </div>
      </div>
      {status ? <div className="status">{status}</div> : null}
      <div className="table-scroll">
        <table className="score-table">
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e7e1d3' }}>
              <th className="col-driver">
                <div className="header-cell">
                  Driver
                  <button className="header-filter-btn" onClick={() => setOpenMenu(openMenu === 'driver_name' ? null : 'driver_name')} aria-label="Filter Driver">
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M3 4h14l-5.4 6.3v4.6l-3.2 1.8v-6.4L3 4z" fill="#5a5043" />
                    </svg>
                  </button>
                  {openMenu === 'driver_name' ? (
                    <div className="header-menu">
                      <div className="menu-actions">
                        <button className="secondary" onClick={() => { setSortKey('driver_name'); setSortDir('asc'); }}>Sort A–Z</button>
                        <button className="secondary" onClick={() => { setSortKey('driver_name'); setSortDir('desc'); }}>Sort Z–A</button>
                      </div>
                      <input className="value-search" placeholder="Filter values" value={valueSearch} onChange={(e) => setValueSearch(e.target.value)} />
                      <div className="value-list">
                        {filteredValues('driver_name').map((val) => (
                          <label key={val}>
                            <input type="checkbox" checked={(valueFilters.driver_name ?? []).includes(val)} onChange={() => toggleValue('driver_name', val)} />
                            {val}
                          </label>
                        ))}
                      </div>
                      <button className="secondary" onClick={() => clearFilter('driver_name')}>Clear filter</button>
                    </div>
                  ) : null}
                </div>
              </th>
              {['site_name','manager','supervisor','driver_score_total','fpd_score','spare_usage_score','speed_violation_score','incident_score','mileage_score','cleaning_score'].map((key) => {
                const label = columns.find((c) => c.key === key)?.label ?? key;
                const colClass =
                  key === 'site_name' ? 'col-site' :
                  key === 'manager' ? 'col-manager' :
                  key === 'supervisor' ? 'col-supervisor' :
                  'col-score';
                return (
                  <th key={key} className={colClass}>
                    <div className="header-cell">
                      {label}
                      <button className="header-filter-btn" onClick={() => setOpenMenu(openMenu === key ? null : key)} aria-label={`Filter ${label}`}>
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="M3 4h14l-5.4 6.3v4.6l-3.2 1.8v-6.4L3 4z" fill="#5a5043" />
                        </svg>
                      </button>
                      {openMenu === key ? (
                        <div className="header-menu">
                          <div className="menu-actions">
                            <button className="secondary" onClick={() => { setSortKey(key); setSortDir('asc'); }}>Sort ↑</button>
                            <button className="secondary" onClick={() => { setSortKey(key); setSortDir('desc'); }}>Sort ↓</button>
                          </div>
                          <input className="value-search" placeholder="Filter values" value={valueSearch} onChange={(e) => setValueSearch(e.target.value)} />
                          <div className="value-list">
                            {filteredValues(key).map((val) => (
                              <label key={val}>
                                <input type="checkbox" checked={(valueFilters[key] ?? []).includes(val)} onChange={() => toggleValue(key, val)} />
                                {val}
                              </label>
                            ))}
                          </div>
                          <button className="secondary" onClick={() => clearFilter(key)}>Clear filter</button>
                        </div>
                      ) : null}
                    </div>
                  </th>
                );
              })}
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <>
                <tr key={row.driver_name} style={{ borderBottom: '1px solid #f0ede6' }}>
                  <td className="col-driver" style={{ fontWeight: 600 }}>{row.driver_name}</td>
                  <td className="col-site">{row.site_name ?? '-'}</td>
                  <td className="col-manager">{row.manager ?? '-'}</td>
                  <td className="col-supervisor">{row.supervisor ?? '-'}</td>
                  <td className="col-score">{row.driver_score_total ?? '-'}</td>
                  <td className="col-score">{row.fpd_score ?? '-'}</td>
                  <td className="col-score">{row.spare_usage_score ?? '-'}</td>
                  <td className="col-score">{row.speed_violation_score ?? '-'}</td>
                  <td className="col-score">{row.incident_score ?? '-'}</td>
                  <td className="col-score">{row.mileage_score ?? '-'}</td>
                  <td className="col-score">{row.cleaning_score ?? '-'}</td>
                  <td className="col-actions">
                    <button className="secondary" onClick={() => toggleRow(row.driver_name)}>
                      {expanded[row.driver_name] ? 'Hide' : 'Details'}
                    </button>
                  </td>
                </tr>
                {expanded[row.driver_name] ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '12px 6px', background: '#fbf8f1' }}>
                      <div
                        style={{
                          display: 'grid',
                          gap: 10,
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
                        }}
                      >
                        <div>
                          <strong>FPD</strong>
                          <div>Trips: {row.components.fpd?.number_of_login_trips_with_scheduled_start_time ?? '-'}</div>
                          <div>FPD %: {row.components.fpd?.percentage_of_fpds ?? '-'}</div>
                        </div>
                        <div>
                          <strong>Spare Usage</strong>
                          <div>Count: {row.components.spare?.spare_usage_count ?? '-'}</div>
                        </div>
                        <div>
                          <strong>Speed</strong>
                          <div>Violations: {row.components.speed?.speed_violations ?? '-'}</div>
                        </div>
                        <div>
                          <strong>Incident</strong>
                          <div>Score: {row.components.incident?.driver_incident_score ?? '-'}</div>
                        </div>
                        <div>
                          <strong>Cleaning</strong>
                          <div>Score: {row.components.cleaning?.vehicle_exterior_score ?? '-'}</div>
                        </div>
                        <div>
                          <strong>Mileage</strong>
                          <div>Vehicle: {row.components.mileage?.vehicle_number ?? '-'}</div>
                          <div>Avg: {row.components.mileage?.average_mileage ?? '-'}</div>
                          <div>Variation: {row.components.mileage?.variation ?? '-'}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
