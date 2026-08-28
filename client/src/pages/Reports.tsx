import React, { useCallback, useState } from 'react';
import { reportService } from '../services';
import { PageLoader } from '../components/ui';

function csvDownload(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<'devices' | 'calibration' | 'maintenance'>('devices');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const [calType, setCalType] = useState('overdue');

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      let res;
      if (activeReport === 'devices') {
        res = await reportService.getDeviceReport();
      } else if (activeReport === 'calibration') {
        res = await reportService.getCalibrationReport({ type: calType });
      } else {
        res = await reportService.getMaintenanceReport();
      }
      setReportData(res.data?.data ?? []);
    } catch {
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeReport, calType]);

  const handleDownload = () => {
    csvDownload(reportData, `${activeReport}-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and export compliance reports</p>
        </div>
      </div>

      {/* Report selector */}
      <div className="card p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Report Type</label>
            <select className="select w-auto" value={activeReport}
              onChange={(e) => { setActiveReport(e.target.value as typeof activeReport); setReportData([]); }}>
              <option value="devices">Device Inventory</option>
              <option value="calibration">Calibration Report</option>
              <option value="maintenance">Maintenance Report</option>
            </select>
          </div>
          {activeReport === 'calibration' && (
            <div>
              <label className="label">Calibration Report Type</label>
              <select className="select w-auto" value={calType} onChange={(e) => setCalType(e.target.value)}>
                <option value="overdue">Overdue Calibrations</option>
                <option value="due">Due in 30 Days</option>
                <option value="history">Calibration History</option>
              </select>
            </div>
          )}
          <button className="btn-primary" onClick={loadReport} disabled={isLoading} id="generate-report-btn">
            {isLoading ? 'Generating...' : '📊 Generate Report'}
          </button>
          {reportData.length > 0 && (
            <button className="btn-secondary" onClick={handleDownload} id="download-report-btn">
              ⬇ Download CSV
            </button>
          )}
        </div>
      </div>

      {/* Report Results */}
      {isLoading ? <PageLoader /> : reportData.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold">{reportData.length} records</h3>
            <button className="btn-secondary btn-sm" onClick={handleDownload}>⬇ Export CSV</button>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  {Object.keys(reportData[0]).map((k) => (
                    <th key={k}>{k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.slice(0, 100).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="text-xs">
                        {val === null ? '—' : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reportData.length > 100 && (
            <div className="p-3 text-xs text-slate-400 text-center border-t">
              Showing first 100 of {reportData.length} rows. Download CSV for full data.
            </div>
          )}
        </div>
      )}
      {!isLoading && reportData.length === 0 && (
        <div className="card p-10 text-center text-slate-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">Select a report type and click Generate</p>
        </div>
      )}
    </div>
  );
}
