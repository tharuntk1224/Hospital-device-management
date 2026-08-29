import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { maintenanceService } from '../services';
import type { MaintenanceRecord } from '../types';
import { PageLoader, ErrorState, EmptyState, SearchInput, Pagination } from '../components/ui';
import { MaintenanceStatusBadge, PriorityBadge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function MaintenancePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole } = useAuth();

  const [items, setItems] = useState<MaintenanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const page   = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const type   = searchParams.get('type') || '';
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
      const res = await maintenanceService.getAll({ page, limit, search: search || undefined, status: status || undefined, type: type || undefined });
      const data = res.data?.data;
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 1);
    } catch { setError('Failed to load maintenance records'); }
    finally { setIsLoading(false); }
  }, [page, limit, search, status, type]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Records</h1>
          <p className="page-subtitle">{total} record{total !== 1 ? 's' : ''}</p>
        </div>
        {hasRole('admin', 'technician') && (
          <button className="btn-primary" onClick={() => navigate('/maintenance/new')} id="add-maintenance-btn">+ Add Maintenance</button>
        )}
      </div>
      <div className="card p-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => setParam('search', v)} placeholder="Search by device..." />
        <select className="select w-auto" value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All Statuses</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="select w-auto" value={type} onChange={(e) => setParam('type', e.target.value)}>
          <option value="">All Types</option>
          <option value="preventive">Preventive</option>
          <option value="corrective">Corrective</option>
          <option value="emergency">Emergency</option>
          <option value="inspection">Inspection</option>
        </select>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={fetchData} /> :
          items.length === 0 ? <EmptyState icon="🔧" title="No maintenance records found" /> : (
          <>
            <div className="table-container rounded-none border-0">
              <table className="table">
                <thead><tr>
                  <th>Device</th><th>Type</th><th>Priority</th>
                  <th>Scheduled</th><th>Completed</th><th>Technician</th><th>Cost</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.id} className="cursor-pointer" onClick={() => navigate(`/maintenance/${m.id}`)}>
                      <td>
                        <p className="font-medium text-primary-700">{m.deviceName}</p>
                        <p className="text-xs text-slate-400">{m.deviceAssetNumber}</p>
                      </td>
                      <td className="capitalize">{m.maintenanceType}</td>
                      <td><PriorityBadge priority={m.priority} /></td>
                      <td className="text-sm">{m.scheduledDate ? format(new Date(m.scheduledDate), 'dd MMM yyyy') : '—'}</td>
                      <td className="text-sm">{m.completionDate ? format(new Date(m.completionDate), 'dd MMM yyyy') : '—'}</td>
                      <td>{m.technicianName ?? '—'}</td>
                      <td>{m.cost != null ? `₹${m.cost.toLocaleString()}` : '—'}</td>
                      <td><MaintenanceStatusBadge status={m.status} /></td>
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
