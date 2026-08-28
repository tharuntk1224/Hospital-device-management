import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { maintenanceRequestService, deviceService } from '../services';
import { MaintenanceRequest, Device } from '../types';
import { PageLoader, ErrorState, EmptyState, Pagination } from '../components/ui';
import { MaintenanceStatusBadge, PriorityBadge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';

export default function MaintenanceRequestsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole, user } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  const page   = parseInt(searchParams.get('page') || '1', 10);
  const status = searchParams.get('status') || '';
  const limit  = 15;

  const { register, handleSubmit, reset } = useForm<{ deviceId: string; problemDescription: string; priority: string }>();

  const fetchData = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const res = await maintenanceRequestService.getAll({ page, limit, status: status || undefined });
      const data = res.data?.data;
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 1);
    } catch { setError('Failed to load requests'); }
    finally { setIsLoading(false); }
  }, [page, limit, status]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    deviceService.getAll({ limit: 200 }).then((r) => setDevices(r.data?.data?.items ?? [])).catch(() => {});
  }, []);

  const onSubmitRequest = async (data: { deviceId: string; problemDescription: string; priority: string }) => {
    try {
      await maintenanceRequestService.create({
        ...data,
        departmentId: user?.departmentId,
      });
      showToast('Maintenance request submitted', 'success');
      setShowNewRequest(false);
      reset();
      fetchData();
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await maintenanceRequestService.update(id, { status });
      showToast('Request updated', 'success');
      fetchData();
    } catch { showToast('Failed to update', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Requests</h1>
          <p className="page-subtitle">{total} request{total !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewRequest(true)} id="new-request-btn">
          + New Request
        </button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select className="select w-auto" value={status} onChange={(e) => {
          const p = new URLSearchParams(searchParams);
          if (e.target.value) p.set('status', e.target.value); else p.delete('status');
          p.set('page', '1');
          setSearchParams(p);
        }}>
          <option value="">All Statuses</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={fetchData} /> :
          items.length === 0 ? <EmptyState icon="📋" title="No service requests found" /> : (
          <>
            <div className="table-container rounded-none border-0">
              <table className="table">
                <thead><tr>
                  <th>Device</th><th>Requester</th><th>Department</th>
                  <th>Priority</th><th>Date</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <p className="font-medium">{r.deviceName}</p>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-[180px] truncate">{r.problemDescription}</p>
                      </td>
                      <td>{r.requesterName}</td>
                      <td>{r.departmentName}</td>
                      <td><PriorityBadge priority={r.priority} /></td>
                      <td className="text-sm">{format(new Date(r.requestDate), 'dd MMM yyyy')}</td>
                      <td><MaintenanceStatusBadge status={r.status} /></td>
                      <td>
                        {hasRole('admin', 'technician') && r.status === 'requested' && (
                          <button className="btn-primary btn-sm" onClick={() => handleUpdateStatus(r.id, 'approved')}>Approve</button>
                        )}
                        {hasRole('admin', 'technician') && r.status === 'approved' && (
                          <button className="btn-secondary btn-sm" onClick={() => navigate(`/maintenance/new?deviceId=${r.deviceId}`)}>
                            Schedule
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit}
              onPageChange={(p) => { const ps = new URLSearchParams(searchParams); ps.set('page', String(p)); setSearchParams(ps); }} />
          </>
        )}
      </div>

      {/* New Request Modal */}
      <Modal isOpen={showNewRequest} onClose={() => setShowNewRequest(false)} title="Submit Maintenance Request"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowNewRequest(false)}>Cancel</button>
            <button form="request-form" type="submit" className="btn-primary" id="submit-request-btn">Submit Request</button>
          </>
        }
      >
        <form id="request-form" onSubmit={handleSubmit(onSubmitRequest)} className="space-y-4">
          <div>
            <label className="label">Device *</label>
            <select className="select" {...register('deviceId', { required: true })}>
              <option value="">Select device</option>
              {devices.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.assetNumber})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="select" {...register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="label">Problem Description *</label>
            <textarea rows={4} className="textarea" {...register('problemDescription', { required: true, minLength: 10 })}
              placeholder="Describe the issue in detail..." />
          </div>
        </form>
      </Modal>
    </div>
  );
}
