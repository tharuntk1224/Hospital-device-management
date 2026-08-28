import { Response, NextFunction } from 'express';
import { pool, withTransaction } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { createCalibrationSchema, updateCalibrationSchema } from '../validators/calibration.validator';
import { sendSuccess, sendCreated, sendPaginated, sendError } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { writeAuditLog } from '../middleware/auditLogger';
import { deleteCache, CACHE_KEYS } from '../config/redis';
import { calculateNextCalibrationDate } from '../utils/calibrationStatus';

const BASE = `
  SELECT c.*,
         d.name as device_name, d.asset_number as device_asset_number,
         d.device_id as device_device_id, d.department_id,
         CONCAT(t.first_name,' ',t.last_name) as technician_name
  FROM calibrations c
  JOIN devices d ON c.device_id = d.id
  LEFT JOIN technicians t ON c.technician_id = t.id
`;

function mapCal(r: Record<string, unknown>) {
  return {
    id: r['id'], deviceId: r['device_id'], deviceName: r['device_name'],
    deviceAssetNumber: r['device_asset_number'],
    calibrationDate: r['calibration_date'], previousCalibrationDate: r['previous_calibration_date'],
    nextCalibrationDueDate: r['next_calibration_due_date'],
    calibrationFrequencyDays: r['calibration_frequency_days'],
    technicianId: r['technician_id'], technicianName: r['technician_name'],
    calibrationStandard: r['calibration_standard'], referenceEquipment: r['reference_equipment'],
    accuracy: r['accuracy'], tolerance: r['tolerance'], result: r['result'],
    certificateNumber: r['certificate_number'], remarks: r['remarks'],
    status: r['status'], createdById: r['created_by_id'], createdAt: r['created_at'], updatedAt: r['updated_at'],
  };
}

export async function getCalibrations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, technicianId, status, deviceId, dateFrom, dateTo } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (search) {
      conditions.push(`(d.name ILIKE $${idx} OR d.asset_number ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (deviceId) { conditions.push(`c.device_id = $${idx++}`); params.push(deviceId); }
    if (technicianId) { conditions.push(`c.technician_id = $${idx++}`); params.push(technicianId); }
    if (status) { conditions.push(`c.status = $${idx++}`); params.push(status); }
    if (dateFrom) { conditions.push(`c.calibration_date >= $${idx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`c.calibration_date <= $${idx++}`); params.push(dateTo); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM calibrations c JOIN devices d ON c.device_id = d.id ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    params.push(limit, offset);
    const result = await pool.query(`${BASE} ${where} ORDER BY c.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, params);
    sendPaginated(res, result.rows.map(mapCal), total, page, limit);
  } catch (err) { next(err); }
}

export async function getCalibrationById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const result = await pool.query(`${BASE} WHERE c.id = $1`, [id]);
    if (!result.rows[0]) { sendError(res, 'Calibration not found', 'CAL_NOT_FOUND', 404); return; }
    const measurements = await pool.query(
      `SELECT * FROM calibration_measurements WHERE calibration_id = $1 ORDER BY created_at`, [id]
    );
    sendSuccess(res, { ...mapCal(result.rows[0]), measurements: measurements.rows });
  } catch (err) { next(err); }
}

export async function createCalibration(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createCalibrationSchema.parse(req.body);

    const calRecord = await withTransaction(async (client) => {
      // Fetch current device calibration info for "previous" date
      const deviceRes = await client.query('SELECT last_calibration_date, calibration_frequency_days FROM devices WHERE id = $1', [data.deviceId]);
      if (!deviceRes.rows[0]) throw new Error('DEVICE_NOT_FOUND');

      const prevDate = deviceRes.rows[0].last_calibration_date;

      // Auto-calculate next date if frequency given but nextDue not provided
      let nextDue = data.nextCalibrationDueDate ? new Date(data.nextCalibrationDueDate) : null;
      if (!nextDue && data.calibrationDate && data.calibrationFrequencyDays) {
        nextDue = calculateNextCalibrationDate(new Date(data.calibrationDate), data.calibrationFrequencyDays);
      }

      const calRes = await client.query(
        `INSERT INTO calibrations (
          device_id, calibration_date, previous_calibration_date, next_calibration_due_date,
          calibration_frequency_days, technician_id, calibration_standard, reference_equipment,
          accuracy, tolerance, result, certificate_number, remarks, status, created_by_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [
          data.deviceId,
          data.calibrationDate ?? null, prevDate ?? null, nextDue ?? null,
          data.calibrationFrequencyDays ?? null, data.technicianId ?? null,
          data.calibrationStandard ?? null, data.referenceEquipment ?? null,
          data.accuracy ?? null, data.tolerance ?? null,
          data.result ?? null, data.certificateNumber ?? null,
          data.remarks ?? null, data.status, req.user!.userId,
        ]
      );

      // Update device calibration dates
      if (data.calibrationDate) {
        await client.query(
          `UPDATE devices SET last_calibration_date = $1, next_calibration_date = $2, updated_at = NOW() WHERE id = $3`,
          [data.calibrationDate, nextDue, data.deviceId]
        );
      }

      // If failed, flag device
      if (data.status === 'failed') {
        await client.query(`UPDATE devices SET status = 'under_maintenance', updated_at = NOW() WHERE id = $1`, [data.deviceId]);
      }

      // Insert measurements
      if (data.measurements?.length) {
        for (const m of data.measurements) {
          await client.query(
            `INSERT INTO calibration_measurements (calibration_id, parameter_name, nominal_value, measured_value, unit, deviation, within_tolerance)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [calRes.rows[0].id, m.parameterName, m.nominalValue ?? null, m.measuredValue, m.unit ?? null, m.deviation ?? null, m.withinTolerance]
          );
        }
      }

      return calRes.rows[0];
    });

    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    await writeAuditLog({ userId: req.user!.userId, action: 'CALIBRATION_CREATED', entityType: 'calibration', entityId: calRecord.id, newValues: { deviceId: data.deviceId, status: data.status }, ipAddress: req.ip ?? null });
    sendCreated(res, mapCal(calRecord), 'Calibration record created');
  } catch (err) { next(err); }
}

export async function updateCalibration(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const data = updateCalibrationSchema.parse(req.body);
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    const colMap: Record<string, string> = {
      calibrationDate: 'calibration_date', nextCalibrationDueDate: 'next_calibration_due_date',
      calibrationFrequencyDays: 'calibration_frequency_days', technicianId: 'technician_id',
      calibrationStandard: 'calibration_standard', referenceEquipment: 'reference_equipment',
      accuracy: 'accuracy', tolerance: 'tolerance', result: 'result',
      certificateNumber: 'certificate_number', remarks: 'remarks', status: 'status',
    };
    for (const [key, col] of Object.entries(colMap)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${col} = $${idx++}`); params.push((data as Record<string, unknown>)[key]);
      }
    }
    if (!fields.length) { sendError(res, 'No fields', 'NO_FIELDS', 400); return; }
    fields.push('updated_at = NOW()');
    params.push(id);
    const result = await pool.query(`UPDATE calibrations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!result.rows[0]) { sendError(res, 'Calibration not found', 'CAL_NOT_FOUND', 404); return; }
    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    await writeAuditLog({ userId: req.user!.userId, action: 'CALIBRATION_UPDATED', entityType: 'calibration', entityId: id, newValues: data as Record<string, unknown>, ipAddress: req.ip ?? null });
    sendSuccess(res, mapCal(result.rows[0]), 'Calibration updated');
  } catch (err) { next(err); }
}

export async function deleteCalibration(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const result = await pool.query('DELETE FROM calibrations WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) { sendError(res, 'Calibration not found', 'CAL_NOT_FOUND', 404); return; }
    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    sendSuccess(res, null, 'Calibration deleted');
  } catch (err) { next(err); }
}
