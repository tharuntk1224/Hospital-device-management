import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { calibrationService } from '../services';
import { Calibration } from '../types';
import { PageLoader, ErrorState } from '../components/ui';
import { CalibrationStatusBadge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function CalibrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [cal, setCal] = useState<Calibration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    calibrationService.getById(id)
      .then((res) => setCal(res.data?.data ?? null))
      .catch(() => setError('Failed to load calibration record'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <PageLoader />;
  if (error || !cal) return <ErrorState message={error} />;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-1">← Back</button>
          <h1 className="page-title">Calibration Record</h1>
          <p className="page-subtitle">{cal.deviceName} · {cal.deviceAssetNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          <CalibrationStatusBadge status={cal.status} />
          {hasRole('admin', 'technician') && (
            <button className="btn-secondary" onClick={() => navigate(`/calibrations/${id}/edit`)}>✎ Edit</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Calibration Details</h3></div>
          <div className="card-body space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Calibration Date</span><span>{cal.calibrationDate ? format(new Date(cal.calibrationDate), 'dd MMM yyyy') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Previous Cal.</span><span>{cal.previousCalibrationDate ? format(new Date(cal.previousCalibrationDate), 'dd MMM yyyy') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Next Due</span><span>{cal.nextCalibrationDueDate ? format(new Date(cal.nextCalibrationDueDate), 'dd MMM yyyy') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Frequency</span><span>{cal.calibrationFrequencyDays ? `${cal.calibrationFrequencyDays} days` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Technician</span><span>{cal.technicianName ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Certificate #</span><span className="font-mono">{cal.certificateNumber ?? '—'}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Results & Standards</h3></div>
          <div className="card-body space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Standard</span><span>{cal.calibrationStandard ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Reference Equipment</span><span>{cal.referenceEquipment ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Accuracy</span><span>{cal.accuracy != null ? `${cal.accuracy}%` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tolerance</span><span>{cal.tolerance != null ? `±${cal.tolerance}` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Result</span><span>{cal.result ?? '—'}</span></div>
          </div>
        </div>
      </div>

      {cal.remarks && (
        <div className="card p-4">
          <p className="text-sm font-medium text-slate-500 mb-1">Remarks</p>
          <p className="text-sm text-slate-700">{cal.remarks}</p>
        </div>
      )}

      {cal.measurements && cal.measurements.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header"><h3 className="font-semibold">Measurement Results</h3></div>
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead><tr><th>Parameter</th><th>Nominal</th><th>Measured</th><th>Unit</th><th>Deviation</th><th>Within Tolerance</th></tr></thead>
              <tbody>
                {cal.measurements.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium">{m.parameterName}</td>
                    <td>{m.nominalValue ?? '—'}</td>
                    <td>{m.measuredValue}</td>
                    <td className="text-slate-500">{m.unit ?? '—'}</td>
                    <td>{m.deviation ?? '—'}</td>
                    <td>{m.withinTolerance ? <span className="badge-valid">✓ Yes</span> : <span className="badge-failed">✕ No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        className="btn-secondary btn-sm"
        onClick={() => cal.deviceId && navigate(`/devices/${cal.deviceId}`)}
      >
        ← View Device
      </button>
    </div>
  );
}
