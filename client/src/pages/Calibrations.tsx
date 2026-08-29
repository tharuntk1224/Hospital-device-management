import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { calibrationService } from '../services';
import type { Calibration } from '../types';
import { PageLoader, ErrorState, EmptyState, SearchInput, Pagination } from '../components/ui';
import { CalibrationStatusBadge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function CalibrationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole } = useAuth();

  const [items, setItems] = useState<Calibration[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const page   = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const limit  = 15;

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.set('page', '1');
    setSearchParams(p);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const res = await calibrationService.getAll({
        page, limit,
        search: search || undefined,
        status: status || undefined,
      });
      const data = res.data?.data;
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 1);
    } catch { setError('Failed to load calibrations'); }
    finally { setIsLoading(false); }
  }, [page, limit, search, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Calibration Records</h1>
          <p className="page-subtitle">{total} record{total !== 1 ? 's' : ''}</p>
        </div>
        {hasRole('admin', 'technician') && (
          <button className="btn-primary" onClick={() => navigate('/calibrations/new')} id="add-calibration-btn">
            + Add Calibration
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => setParam('search', v)} placeholder="Search by device name..." />
        <select className="select w-auto" value={status} onChange={(e) => setParam('status', e.target.value)} id="filter-cal-status">
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={fetchData} /> :
          items.length === 0 ? <EmptyState icon="📐" title="No calibration records found" /> : (
          <>
            <div className="table-container rounded-none border-0">
              <table className="table">
                <thead><tr>
                  <th>Device</th><th>Cal. Date</th><th>Next Due</th>
                  <th>Technician</th><th>Certificate #</th><th>Accuracy</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/calibrations/${c.id}`)}>
                      <td>
                        <p className="font-medium text-primary-700">{c.deviceName}</p>
                        <p className="text-xs text-slate-400">{c.deviceAssetNumber}</p>
                      </td>
                      <td>{c.calibrationDate ? format(new Date(c.calibrationDate), 'dd MMM yyyy') : '—'}</td>
                      <td>{c.nextCalibrationDueDate ? format(new Date(c.nextCalibrationDueDate), 'dd MMM yyyy') : '—'}</td>
                      <td>{c.technicianName ?? '—'}</td>
                      <td className="font-mono text-xs">{c.certificateNumber ?? '—'}</td>
                      <td>{c.accuracy != null ? `${c.accuracy}%` : '—'}</td>
                      <td><CalibrationStatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit}
              onPageChange={(p) => { const ps = new URLSearchParams(searchParams); ps.set('page', String(p)); setSearchParams(ps); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
