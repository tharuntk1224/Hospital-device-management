import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { maintenanceService, deviceService, technicianService } from '../services';
import { Device, Technician } from '../types';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';

interface MaintFormData {
  deviceId: string; maintenanceType: string; priority: string; status: string;
  requestDate: string; scheduledDate: string; startDate: string; completionDate: string;
  technicianId: string; problemDescription: string; workPerformed: string;
  partsReplaced: string; cost: string; downtimeHours: string; result: string; remarks: string;
}

export default function MaintenanceFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const prefilledDeviceId = searchParams.get('deviceId') || '';

  const [devices, setDevices] = useState<Device[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit } = useForm<MaintFormData>({
    defaultValues: { deviceId: prefilledDeviceId, maintenanceType: 'preventive', priority: 'medium', status: 'scheduled' },
  });

  useEffect(() => {
    Promise.all([deviceService.getAll({ limit: 200 }), technicianService.getAll()])
      .then(([dRes, tRes]) => {
        setDevices(dRes.data?.data?.items ?? []);
        setTechnicians(tRes.data?.data ?? []);
      }).catch(() => {});
  }, []);

  const onSubmit = async (data: MaintFormData) => {
    setIsSubmitting(true);
    try {
      const res = await maintenanceService.create({
        ...data,
        technicianId: data.technicianId || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        downtimeHours: data.downtimeHours ? parseFloat(data.downtimeHours) : null,
        requestDate: data.requestDate || null,
        scheduledDate: data.scheduledDate || null,
        startDate: data.startDate || null,
        completionDate: data.completionDate || null,
        problemDescription: data.problemDescription || null,
        workPerformed: data.workPerformed || null,
        partsReplaced: data.partsReplaced || null,
        result: data.result || null,
        remarks: data.remarks || null,
      });
      showToast('Maintenance record created', 'success');
      navigate(`/maintenance/${res.data?.data?.id}`);
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed', 'error');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-1">← Back</button>
          <h1 className="page-title">Add Maintenance Record</h1>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Maintenance Details</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Device *</label>
              <select className="select" {...register('deviceId', { required: true })}>
                <option value="">Select device</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.assetNumber})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Technician</label>
              <select className="select" {...register('technicianId')}>
                <option value="">Select technician</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Maintenance Type</label>
              <select className="select" {...register('maintenanceType')}>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="emergency">Emergency</option>
                <option value="inspection">Inspection</option>
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
              <label className="label">Status</label>
              <select className="select" {...register('status')}>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div><label className="label">Scheduled Date</label><input type="date" className="input" {...register('scheduledDate')} /></div>
            <div><label className="label">Start Date</label><input type="date" className="input" {...register('startDate')} /></div>
            <div><label className="label">Completion Date</label><input type="date" className="input" {...register('completionDate')} /></div>
            <div>
              <label className="label">Cost (₹)</label>
              <input type="number" step="0.01" className="input" {...register('cost')} />
            </div>
            <div>
              <label className="label">Downtime (hours)</label>
              <input type="number" step="0.5" className="input" {...register('downtimeHours')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Problem Description</label>
              <textarea rows={2} className="textarea" {...register('problemDescription')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Work Performed</label>
              <textarea rows={2} className="textarea" {...register('workPerformed')} />
            </div>
            <div>
              <label className="label">Parts Replaced</label>
              <textarea rows={2} className="textarea" {...register('partsReplaced')} />
            </div>
            <div>
              <label className="label">Result</label>
              <textarea rows={2} className="textarea" {...register('result')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Remarks</label>
              <textarea rows={2} className="textarea" {...register('remarks')} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting} id="save-maintenance-btn">
            {isSubmitting ? <><Spinner size="sm" /> Saving...</> : 'Create Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
