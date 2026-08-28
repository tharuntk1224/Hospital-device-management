import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { calibrationService, deviceService, technicianService } from '../services';
import { Device, Technician } from '../types';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';

interface CalFormData {
  deviceId: string; technicianId: string; calibrationDate: string;
  nextCalibrationDueDate: string; calibrationFrequencyDays: string;
  calibrationStandard: string; referenceEquipment: string;
  accuracy: string; tolerance: string; result: string;
  certificateNumber: string; remarks: string; status: string;
  measurements: { parameterName: string; nominalValue: string; measuredValue: string; unit: string; deviation: string; withinTolerance: boolean }[];
}

export default function CalibrationFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const prefilledDeviceId = searchParams.get('deviceId') || '';

  const [devices, setDevices] = useState<Device[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control } = useForm<CalFormData>({
    defaultValues: { deviceId: prefilledDeviceId, status: 'scheduled', measurements: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'measurements' });

  useEffect(() => {
    Promise.all([
      deviceService.getAll({ limit: 200 }),
      technicianService.getAll({ status: 'active' }),
    ]).then(([dRes, tRes]) => {
      setDevices(dRes.data?.data?.items ?? []);
      setTechnicians(tRes.data?.data ?? []);
    }).catch(() => {});
  }, []);

  const onSubmit = async (data: CalFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        deviceId: data.deviceId,
        technicianId: data.technicianId || null,
        calibrationDate: data.calibrationDate || null,
        nextCalibrationDueDate: data.nextCalibrationDueDate || null,
        calibrationFrequencyDays: data.calibrationFrequencyDays ? parseInt(data.calibrationFrequencyDays, 10) : null,
        calibrationStandard: data.calibrationStandard || null,
        referenceEquipment: data.referenceEquipment || null,
        accuracy: data.accuracy ? parseFloat(data.accuracy) : null,
        tolerance: data.tolerance ? parseFloat(data.tolerance) : null,
        result: data.result || null,
        certificateNumber: data.certificateNumber || null,
        remarks: data.remarks || null,
        status: data.status,
        measurements: fields.length > 0 ? data.measurements.map((m) => ({
          parameterName: m.parameterName,
          nominalValue: m.nominalValue ? parseFloat(m.nominalValue) : null,
          measuredValue: parseFloat(m.measuredValue),
          unit: m.unit || null,
          deviation: m.deviation ? parseFloat(m.deviation) : null,
          withinTolerance: m.withinTolerance,
        })) : undefined,
      };
      const res = await calibrationService.create(payload);
      showToast('Calibration record created', 'success');
      navigate(`/calibrations/${res.data?.data?.id}`);
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create calibration', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-1">← Back</button>
          <h1 className="page-title">Add Calibration Record</h1>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Calibration Details</h3></div>
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
              <label className="label">Calibration Date</label>
              <input type="date" className="input" {...register('calibrationDate')} />
            </div>
            <div>
              <label className="label">Next Due Date</label>
              <input type="date" className="input" {...register('nextCalibrationDueDate')} />
            </div>
            <div>
              <label className="label">Frequency (days)</label>
              <input type="number" className="input" {...register('calibrationFrequencyDays')} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" {...register('status')}>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="label">Calibration Standard</label>
              <input className="input" {...register('calibrationStandard')} placeholder="ISO 80601-2-61" />
            </div>
            <div>
              <label className="label">Reference Equipment</label>
              <input className="input" {...register('referenceEquipment')} />
            </div>
            <div>
              <label className="label">Accuracy (%)</label>
              <input type="number" step="0.01" className="input" {...register('accuracy')} />
            </div>
            <div>
              <label className="label">Tolerance (±)</label>
              <input type="number" step="0.01" className="input" {...register('tolerance')} />
            </div>
            <div>
              <label className="label">Certificate Number</label>
              <input className="input" {...register('certificateNumber')} placeholder="CAL-2025-001" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Result / Summary</label>
              <textarea rows={2} className="textarea" {...register('result')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Remarks</label>
              <textarea rows={2} className="textarea" {...register('remarks')} />
            </div>
          </div>
        </div>

        {/* Measurements */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold">Measurements</h3>
            <button type="button" className="btn-secondary btn-sm"
              onClick={() => append({ parameterName: '', nominalValue: '', measuredValue: '', unit: '', deviation: '', withinTolerance: true })}>
              + Add Measurement
            </button>
          </div>
          <div className="card-body">
            {fields.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No measurements added yet.</p>
            ) : (
              <div className="space-y-3">
                {fields.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div>
                      <label className="label text-xs">Parameter</label>
                      <input className="input" {...register(`measurements.${i}.parameterName`)} placeholder="Heart Rate" />
                    </div>
                    <div>
                      <label className="label text-xs">Nominal</label>
                      <input type="number" step="any" className="input" {...register(`measurements.${i}.nominalValue`)} />
                    </div>
                    <div>
                      <label className="label text-xs">Measured *</label>
                      <input type="number" step="any" className="input" {...register(`measurements.${i}.measuredValue`, { required: true })} />
                    </div>
                    <div>
                      <label className="label text-xs">Unit</label>
                      <input className="input" {...register(`measurements.${i}.unit`)} placeholder="bpm" />
                    </div>
                    <div>
                      <label className="label text-xs">Deviation</label>
                      <input type="number" step="any" className="input" {...register(`measurements.${i}.deviation`)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" {...register(`measurements.${i}.withinTolerance`)} className="w-4 h-4" />
                      <label className="text-xs">In Tolerance</label>
                      <button type="button" onClick={() => remove(i)} className="btn-ghost btn-sm text-danger-500 ml-auto">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting} id="save-calibration-btn">
            {isSubmitting ? <><Spinner size="sm" /> Saving...</> : 'Create Calibration Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
