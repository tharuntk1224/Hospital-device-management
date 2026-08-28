import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deviceService, calibrationService, maintenanceService } from '../services';
import { Device, Calibration, MaintenanceRecord } from '../types';
import {
  PageLoader, ErrorState,
} from '../components/ui';
import {
  DeviceStatusBadge, CalibrationDueBadge, RiskBadge,
  CalibrationStatusBadge, MaintenanceStatusBadge, PriorityBadge,
} from '../components/ui/Badge';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ui/Modal';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2.5 border-b border-slate-50 last:border-0">
      <dt className="text-sm text-slate-500 font-medium sm:w-48 shrink-0">{label}</dt>
      <dd className="text-sm text-slate-800">{value ?? <span className="text-slate-300">—</span>}</dd>
    </div>
  );
}

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [device, setDevice] = useState<Device | null>(null);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'calibration' | 'maintenance' | 'timeline'>('info');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const [dRes, cRes, mRes] = await Promise.all([
        deviceService.getById(id),
        calibrationService.getAll({ deviceId: id, limit: 50 }),
        maintenanceService.getAll({ deviceId: id, limit: 50 }),
      ]);
      setDevice(dRes.data?.data ?? null);
      setCalibrations(cRes.data?.data?.items ?? []);
      setMaintenance(mRes.data?.data?.items ?? []);
    } catch {
      setError('Failed to load device details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deviceService.delete(id);
      showToast('Device deleted successfully', 'success');
      navigate('/devices');
    } catch {
      showToast('Failed to delete device', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (error || !device) return <ErrorState message={error} onRetry={fetchData} />;

  const daysUntilCal = device.nextCalibrationDate
    ? differenceInDays(new Date(device.nextCalibrationDate), new Date())
    : null;

  // Build timeline
  const timeline = [
    { date: device.createdAt, type: 'created', label: 'Device Registered', icon: '🔬', color: 'bg-primary-500' },
    ...calibrations.map((c) => ({
      date: c.calibrationDate ?? c.createdAt,
      type: 'calibration',
      label: `Calibration — ${c.status}`,
      icon: '📐',
      color: c.status === 'passed' ? 'bg-success-500' : c.status === 'failed' ? 'bg-danger-500' : 'bg-blue-500',
      detail: c.certificateNumber ? `Cert: ${c.certificateNumber}` : undefined,
    })),
    ...maintenance.map((m) => ({
      date: m.completionDate ?? m.scheduledDate ?? m.createdAt,
      type: 'maintenance',
      label: `${m.maintenanceType.charAt(0).toUpperCase() + m.maintenanceType.slice(1)} Maintenance — ${m.status}`,
      icon: '🔧',
      color: m.status === 'completed' ? 'bg-success-500' : 'bg-orange-400',
      detail: m.workPerformed?.substring(0, 80),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/devices')} className="btn-ghost btn-sm">← Back</button>
          <div>
            <h1 className="page-title">{device.name}</h1>
            <p className="page-subtitle">{device.deviceId} · {device.manufacturer} {device.model}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasRole('admin', 'technician') && (
            <button className="btn-secondary" onClick={() => navigate(`/devices/${id}/edit`)}>
              ✎ Edit
            </button>
          )}
          {hasRole('admin') && (
            <button className="btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Status</p>
          <DeviceStatusBadge status={device.status} />
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Risk Level</p>
          <RiskBadge level={device.riskLevel} />
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Calibration</p>
          {device.calibrationRequired
            ? <CalibrationDueBadge status={device.calibrationDueStatus ?? 'overdue'} />
            : <span className="text-slate-400 text-xs">Not Required</span>}
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Days Until Cal.</p>
          <p className={`text-2xl font-bold ${
            daysUntilCal === null ? 'text-slate-400' :
            daysUntilCal < 0 ? 'text-danger-600' :
            daysUntilCal <= 7 ? 'text-warning-600' : 'text-success-600'
          }`}>
            {daysUntilCal === null ? '—' : daysUntilCal < 0 ? `${Math.abs(daysUntilCal)}d overdue` : `${daysUntilCal}d`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50">
          {(['info', 'calibration', 'maintenance', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-primary-700 border-b-2 border-primary-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'calibration' ? `Calibration (${calibrations.length})` :
               tab === 'maintenance' ? `Maintenance (${maintenance.length})` :
               tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Info Tab ── */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
              <dl>
                <InfoRow label="Asset Number" value={<span className="font-mono">{device.assetNumber}</span>} />
                <InfoRow label="Serial Number" value={<span className="font-mono">{device.serialNumber}</span>} />
                <InfoRow label="Category" value={device.categoryName} />
                <InfoRow label="Manufacturer" value={device.manufacturer} />
                <InfoRow label="Model" value={device.model} />
                <InfoRow label="Location" value={device.location} />
                <InfoRow label="Department" value={device.departmentName} />
                <InfoRow label="Assigned Technician" value={device.technicianName} />
              </dl>
              <dl>
                <InfoRow label="Purchase Date" value={device.purchaseDate ? format(new Date(device.purchaseDate), 'dd MMM yyyy') : null} />
                <InfoRow label="Installation Date" value={device.installationDate ? format(new Date(device.installationDate), 'dd MMM yyyy') : null} />
                <InfoRow label="Warranty Expiry" value={device.warrantyExpiry ? format(new Date(device.warrantyExpiry), 'dd MMM yyyy') : null} />
                <InfoRow label="Cal. Frequency" value={device.calibrationFrequencyDays ? `Every ${device.calibrationFrequencyDays} days` : null} />
                <InfoRow label="Last Calibration" value={device.lastCalibrationDate ? format(new Date(device.lastCalibrationDate), 'dd MMM yyyy') : null} />
                <InfoRow label="Next Calibration" value={device.nextCalibrationDate ? format(new Date(device.nextCalibrationDate), 'dd MMM yyyy') : null} />
                <InfoRow label="Last Maintenance" value={device.lastMaintenanceDate ? format(new Date(device.lastMaintenanceDate), 'dd MMM yyyy') : null} />
                <InfoRow label="Registered" value={format(new Date(device.createdAt), 'dd MMM yyyy')} />
              </dl>
              {device.description && (
                <div className="md:col-span-2 mt-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700">{device.description}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Calibration Tab ── */}
          {activeTab === 'calibration' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Calibration History</h3>
                {hasRole('admin', 'technician') && (
                  <button className="btn-primary btn-sm" onClick={() => navigate(`/calibrations/new?deviceId=${id}`)}>
                    + Add Calibration
                  </button>
                )}
              </div>
              {calibrations.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No calibration records found.</div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead><tr>
                      <th>Date</th><th>Next Due</th><th>Technician</th>
                      <th>Certificate</th><th>Accuracy</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      {calibrations.map((c) => (
                        <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/calibrations/${c.id}`)}>
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
              )}
            </div>
          )}

          {/* ── Maintenance Tab ── */}
          {activeTab === 'maintenance' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Maintenance History</h3>
                {hasRole('admin', 'technician') && (
                  <button className="btn-primary btn-sm" onClick={() => navigate(`/maintenance/new?deviceId=${id}`)}>
                    + Add Maintenance
                  </button>
                )}
              </div>
              {maintenance.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No maintenance records found.</div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead><tr>
                      <th>Type</th><th>Priority</th><th>Scheduled</th>
                      <th>Completed</th><th>Technician</th><th>Cost</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      {maintenance.map((m) => (
                        <tr key={m.id} className="cursor-pointer" onClick={() => navigate(`/maintenance/${m.id}`)}>
                          <td className="capitalize">{m.maintenanceType}</td>
                          <td><PriorityBadge priority={m.priority} /></td>
                          <td>{m.scheduledDate ? format(new Date(m.scheduledDate), 'dd MMM yyyy') : '—'}</td>
                          <td>{m.completionDate ? format(new Date(m.completionDate), 'dd MMM yyyy') : '—'}</td>
                          <td>{m.technicianName ?? '—'}</td>
                          <td>{m.cost != null ? `₹${m.cost.toLocaleString()}` : '—'}</td>
                          <td><MaintenanceStatusBadge status={m.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Timeline Tab ── */}
          {activeTab === 'timeline' && (
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-800 mb-4">Device History Timeline</h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-4 ml-12">
                  {timeline.map((event, i) => (
                    <div key={i} className="relative">
                      <div className={`absolute -left-[3.25rem] w-6 h-6 rounded-full ${event.color} flex items-center justify-center text-xs`}>
                        {event.icon}
                      </div>
                      <div className="card p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800">{event.label}</p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(event.date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        {event.detail && <p className="text-xs text-slate-500 mt-1">{event.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Device"
        message={`Are you sure you want to permanently delete "${device.name}"? This will also delete all associated calibration and maintenance records.`}
        confirmLabel="Delete Device"
        isLoading={isDeleting}
      />
    </div>
  );
}
