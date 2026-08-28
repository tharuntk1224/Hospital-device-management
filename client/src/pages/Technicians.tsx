import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { technicianService } from '../services';
import { Technician } from '../types';
import { PageLoader, ErrorState, EmptyState, SearchInput } from '../components/ui';
import { TechStatusBadge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

export default function TechniciansPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [items, setItems] = useState<Technician[]>([]);
  const [filteredItems, setFilteredItems] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const res = await technicianService.getAll();
      setItems(res.data?.data ?? []);
    } catch { setError('Failed to load technicians'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredItems(
      items.filter((t) =>
        `${t.firstName} ${t.lastName} ${t.employeeId} ${t.email} ${t.specialization ?? ''}`.toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Technicians</h1>
          <p className="page-subtitle">{items.length} technician{items.length !== 1 ? 's' : ''}</p>
        </div>
        {hasRole('admin') && (
          <button className="btn-primary" onClick={() => navigate('/technicians/new')} id="add-technician-btn">+ Add Technician</button>
        )}
      </div>
      <div className="card p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, ID, email..." />
      </div>
      {isLoading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={fetchData} /> :
        filteredItems.length === 0 ? <EmptyState icon="👨‍🔧" title="No technicians found" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((t) => (
            <div key={t.id} className="card p-5 hover:shadow-card-hover transition-shadow cursor-pointer"
              onClick={() => navigate(`/technicians/${t.id}`)}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg shrink-0">
                  {t.firstName[0]}{t.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{t.firstName} {t.lastName}</p>
                  <p className="text-xs text-slate-500">{t.employeeId}</p>
                </div>
                <TechStatusBadge status={t.status} />
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p>📧 {t.email}</p>
                {t.phone && <p>📱 {t.phone}</p>}
                {t.specialization && <p>🔬 {t.specialization}</p>}
                {t.departmentName && <p>🏥 {t.departmentName}</p>}
              </div>
              <div className="flex gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>⏳ {t.pendingMaintenance ?? 0} pending</span>
                <span>✓ {t.completedMaintenanceMonth ?? 0} completed/mo</span>
                <span>📐 {t.calibrationWorkload ?? 0} calibrations</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
