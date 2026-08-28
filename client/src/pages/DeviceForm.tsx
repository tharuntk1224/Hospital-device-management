import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { deviceService, departmentService, categoryService, technicianService } from '../services';
import { Department, DeviceCategory, Technician } from '../types';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';

interface DeviceFormData {
  deviceId: string; assetNumber: string; serialNumber: string; name: string;
  categoryId: string; manufacturer: string; model: string;
  purchaseDate: string; installationDate: string; warrantyExpiry: string;
  departmentId: string; location: string; technicianId: string;
  status: string; riskLevel: string; calibrationRequired: boolean;
  calibrationFrequencyDays: string;
  lastCalibrationDate: string; nextCalibrationDate: string;
  description: string; notes: string;
}

interface DeviceFormPageProps { mode: 'create' | 'edit'; }

export default function DeviceFormPage({ mode }: DeviceFormPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const deviceId = searchParams.get('id') || undefined;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === 'edit');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DeviceFormData>({
    defaultValues: { status: 'active', riskLevel: 'medium', calibrationRequired: true },
  });

  useEffect(() => {
    Promise.all([departmentService.getAll(), categoryService.getAll(), technicianService.getAll()])
      .then(([dRes, cRes, tRes]) => {
        setDepartments(dRes.data?.data ?? []);
        setCategories(cRes.data?.data ?? []);
        setTechnicians(tRes.data?.data ?? []);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === 'edit' && deviceId) {
      deviceService.getById(deviceId).then((res) => {
        const d = res.data?.data;
        if (d) {
          reset({
            ...d,
            categoryId: d.categoryId,
            departmentId: d.departmentId,
            technicianId: d.technicianId ?? '',
            purchaseDate: d.purchaseDate ? d.purchaseDate.split('T')[0] : '',
            installationDate: d.installationDate ? d.installationDate.split('T')[0] : '',
            warrantyExpiry: d.warrantyExpiry ? d.warrantyExpiry.split('T')[0] : '',
            lastCalibrationDate: d.lastCalibrationDate ? d.lastCalibrationDate.split('T')[0] : '',
            nextCalibrationDate: d.nextCalibrationDate ? d.nextCalibrationDate.split('T')[0] : '',
            calibrationFrequencyDays: String(d.calibrationFrequencyDays ?? ''),
            description: d.description ?? '',
            notes: d.notes ?? '',
          });
        }
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
  }, [mode, deviceId, reset]);

  const onSubmit = async (data: DeviceFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        calibrationFrequencyDays: data.calibrationFrequencyDays ? parseInt(data.calibrationFrequencyDays, 10) : null,
        technicianId: data.technicianId || null,
        purchaseDate: data.purchaseDate || null,
        installationDate: data.installationDate || null,
        warrantyExpiry: data.warrantyExpiry || null,
        lastCalibrationDate: data.lastCalibrationDate || null,
        nextCalibrationDate: data.nextCalibrationDate || null,
        location: data.location || null,
        description: data.description || null,
        notes: data.notes || null,
      };
      if (mode === 'create') {
        const res = await deviceService.create(payload);
        showToast('Device created successfully', 'success');
        navigate(`/devices/${res.data?.data?.id}`);
      } else if (deviceId) {
        await deviceService.update(deviceId, payload);
        showToast('Device updated successfully', 'success');
        navigate(`/devices/${deviceId}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Operation failed';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-1">← Back</button>
          <h1 className="page-title">{mode === 'create' ? 'Add New Device' : 'Edit Device'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Info */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-800">Basic Information</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Device ID *</label>
              <input className={`input ${errors.deviceId ? 'input-error' : ''}`} {...register('deviceId', { required: true })} placeholder="DEV-001" />
            </div>
            <div>
              <label className="label">Asset Number *</label>
              <input className={`input ${errors.assetNumber ? 'input-error' : ''}`} {...register('assetNumber', { required: true })} placeholder="AST-001" />
            </div>
            <div>
              <label className="label">Serial Number *</label>
              <input className={`input ${errors.serialNumber ? 'input-error' : ''}`} {...register('serialNumber', { required: true })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Device Name *</label>
              <input className={`input ${errors.name ? 'input-error' : ''}`} {...register('name', { required: true })} placeholder="Patient Monitor Pro" />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className={`select ${errors.categoryId ? 'input-error' : ''}`} {...register('categoryId', { required: true })}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Manufacturer *</label>
              <input className="input" {...register('manufacturer', { required: true })} />
            </div>
            <div>
              <label className="label">Model *</label>
              <input className="input" {...register('model', { required: true })} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-800">Location & Assignment</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Department *</label>
              <select className={`select ${errors.departmentId ? 'input-error' : ''}`} {...register('departmentId', { required: true })}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" {...register('location')} placeholder="ICU Bed 1" />
            </div>
            <div>
              <label className="label">Assigned Technician</label>
              <select className="select" {...register('technicianId')}>
                <option value="">None</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-800">Dates</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="label">Purchase Date</label><input type="date" className="input" {...register('purchaseDate')} /></div>
            <div><label className="label">Installation Date</label><input type="date" className="input" {...register('installationDate')} /></div>
            <div><label className="label">Warranty Expiry</label><input type="date" className="input" {...register('warrantyExpiry')} /></div>
          </div>
        </div>

        {/* Status & Risk */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-800">Status & Risk</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Device Status</label>
              <select className="select" {...register('status')}>
                <option value="active">Active</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="out_of_service">Out of Service</option>
                <option value="retired">Retired</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="label">Risk Level</label>
              <select className="select" {...register('riskLevel')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Calibration */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-800">Calibration Settings</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="cal-required" className="w-4 h-4 text-primary-600" {...register('calibrationRequired')} />
              <label htmlFor="cal-required" className="text-sm font-medium text-slate-700">Calibration Required</label>
            </div>
            <div>
              <label className="label">Calibration Frequency (days)</label>
              <input type="number" className="input" {...register('calibrationFrequencyDays')} placeholder="180" min="1" />
            </div>
            <div>
              <label className="label">Last Calibration Date</label>
              <input type="date" className="input" {...register('lastCalibrationDate')} />
            </div>
            <div>
              <label className="label">Next Calibration Date</label>
              <input type="date" className="input" {...register('nextCalibrationDate')} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-800">Additional Information</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Description</label>
              <textarea rows={3} className="textarea" {...register('description')} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea rows={3} className="textarea" {...register('notes')} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting} id="save-device-btn">
            {isSubmitting ? <><Spinner size="sm" /> Saving...</> : mode === 'create' ? 'Create Device' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
