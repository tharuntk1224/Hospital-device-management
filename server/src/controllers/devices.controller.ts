import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { createDeviceSchema, updateDeviceSchema } from '../validators/device.validator';
import { sendSuccess, sendCreated, sendPaginated, sendError } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { getCalibrationDueStatus } from '../utils/calibrationStatus';
import { writeAuditLog } from '../middleware/auditLogger';
import { deleteCache, CACHE_KEYS } from '../config/redis';
import { CalibrationDueStatus } from '../types';

function mapDevice(r: Record<string, unknown>) {
  const nextCal = r['next_calibration_date'] ? new Date(r['next_calibration_date'] as string) : null;
  const dueStatus: CalibrationDueStatus = getCalibrationDueStatus(nextCal, r['calibration_required'] as boolean);
  return {
    id: r['id'], deviceId: r['device_id'], assetNumber: r['asset_number'],
    serialNumber: r['serial_number'], name: r['name'],
    categoryId: r['category_id'], categoryName: r['category_name'],
    manufacturer: r['manufacturer'], model: r['model'],
    purchaseDate: r['purchase_date'], installationDate: r['installation_date'],
    warrantyExpiry: r['warranty_expiry'],
    departmentId: r['department_id'], departmentName: r['department_name'],
    location: r['location'], technicianId: r['technician_id'],
    technicianName: r['technician_name'],
    status: r['status'], riskLevel: r['risk_level'],
    calibrationRequired: r['calibration_required'],
    calibrationFrequencyDays: r['calibration_frequency_days'],
    lastCalibrationDate: r['last_calibration_date'],
    nextCalibrationDate: r['next_calibration_date'],
    lastMaintenanceDate: r['last_maintenance_date'],
    nextMaintenanceDate: r['next_maintenance_date'],
    description: r['description'], notes: r['notes'],
    createdAt: r['created_at'], updatedAt: r['updated_at'],
    calibrationDueStatus: dueStatus,
  };
}

const BASE_QUERY = `
  SELECT d.*, c.name as category_name, dept.name as department_name,
         CONCAT(t.first_name, ' ', t.last_name) as technician_name
  FROM devices d
  LEFT JOIN device_categories c ON d.category_id = c.id
  LEFT JOIN departments dept ON d.department_id = dept.id
  LEFT JOIN technicians t ON d.technician_id = t.id
`;

export async function getDevices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, departmentId, categoryId, status, riskLevel } = req.query as Record<string, string>;
    const calibrationStatus = req.query['calibrationStatus'] as CalibrationDueStatus | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Dept staff can only see their department
    if (req.user!.role === 'staff' && req.user!.departmentId) {
      conditions.push(`d.department_id = $${idx++}`);
      params.push(req.user!.departmentId);
    }

    if (search) {
      conditions.push(`(d.device_id ILIKE $${idx} OR d.asset_number ILIKE $${idx} OR d.serial_number ILIKE $${idx} OR d.name ILIKE $${idx} OR d.manufacturer ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (departmentId) { conditions.push(`d.department_id = $${idx++}`); params.push(departmentId); }
    if (categoryId) { conditions.push(`d.category_id = $${idx++}`); params.push(categoryId); }
    if (status) { conditions.push(`d.status = $${idx++}`); params.push(status); }
    if (riskLevel) { conditions.push(`d.risk_level = $${idx++}`); params.push(riskLevel); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM devices d ${whereClause}`, params);
    let total = parseInt(countRes.rows[0].count, 10);

    params.push(500); // fetch more to allow client-side calibration filter
    const result = await pool.query(`${BASE_QUERY} ${whereClause} ORDER BY d.created_at DESC LIMIT $${idx} OFFSET 0`, params);

    let devices = result.rows.map(mapDevice);

    // Filter by calibration status (computed, not stored)
    if (calibrationStatus) {
      devices = devices.filter((d) => d.calibrationDueStatus === calibrationStatus);
      total = devices.length;
    }

    const paginated = devices.slice(offset, offset + limit);
    sendPaginated(res, paginated, total, page, limit);
  } catch (err) { next(err); }
}

export async function getDeviceById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const result = await pool.query(`${BASE_QUERY} WHERE d.id = $1`, [id]);
    if (!result.rows[0]) { sendError(res, 'Device not found', 'DEVICE_NOT_FOUND', 404); return; }
    sendSuccess(res, mapDevice(result.rows[0]));
  } catch (err) { next(err); }
}

export async function createDevice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createDeviceSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO devices (
        device_id, asset_number, serial_number, name, category_id, manufacturer, model,
        purchase_date, installation_date, warranty_expiry, department_id, location, technician_id,
        status, risk_level, calibration_required, calibration_frequency_days,
        last_calibration_date, next_calibration_date, last_maintenance_date, next_maintenance_date,
        description, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *`,
      [
        data.deviceId, data.assetNumber, data.serialNumber, data.name, data.categoryId,
        data.manufacturer, data.model,
        data.purchaseDate ?? null, data.installationDate ?? null, data.warrantyExpiry ?? null,
        data.departmentId, data.location ?? null, data.technicianId ?? null,
        data.status, data.riskLevel, data.calibrationRequired,
        data.calibrationFrequencyDays ?? null,
        data.lastCalibrationDate ?? null, data.nextCalibrationDate ?? null,
        data.lastMaintenanceDate ?? null, data.nextMaintenanceDate ?? null,
        data.description ?? null, data.notes ?? null,
      ]
    );
    await deleteCache(CACHE_KEYS.DEVICE_LIST);
    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    const device = mapDevice(result.rows[0]);
    await writeAuditLog({ userId: req.user!.userId, action: 'DEVICE_CREATED', entityType: 'device', entityId: result.rows[0]['id'] as string, newValues: { name: data.name, deviceId: data.deviceId }, ipAddress: req.ip ?? null });
    sendCreated(res, device, 'Device created successfully');
  } catch (err) { next(err); }
}

export async function updateDevice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const data = updateDeviceSchema.parse(req.body);
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    const fieldMap: Record<string, string> = {
      deviceId: 'device_id', assetNumber: 'asset_number', serialNumber: 'serial_number',
      name: 'name', categoryId: 'category_id', manufacturer: 'manufacturer', model: 'model',
      purchaseDate: 'purchase_date', installationDate: 'installation_date', warrantyExpiry: 'warranty_expiry',
      departmentId: 'department_id', location: 'location', technicianId: 'technician_id',
      status: 'status', riskLevel: 'risk_level', calibrationRequired: 'calibration_required',
      calibrationFrequencyDays: 'calibration_frequency_days',
      lastCalibrationDate: 'last_calibration_date', nextCalibrationDate: 'next_calibration_date',
      lastMaintenanceDate: 'last_maintenance_date', nextMaintenanceDate: 'next_maintenance_date',
      description: 'description', notes: 'notes',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        params.push((data as Record<string, unknown>)[key]);
      }
    }
    if (fields.length === 0) { sendError(res, 'No fields to update', 'NO_FIELDS', 400); return; }
    fields.push('updated_at = NOW()');
    params.push(id);
    const result = await pool.query(`UPDATE devices SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!result.rows[0]) { sendError(res, 'Device not found', 'DEVICE_NOT_FOUND', 404); return; }
    await deleteCache(CACHE_KEYS.DEVICE_LIST);
    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    await writeAuditLog({ userId: req.user!.userId, action: 'DEVICE_UPDATED', entityType: 'device', entityId: id, newValues: data as Record<string, unknown>, ipAddress: req.ip ?? null });
    sendSuccess(res, mapDevice(result.rows[0]), 'Device updated successfully');
  } catch (err) { next(err); }
}

export async function deleteDevice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const result = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING id, name', [id]);
    if (!result.rows[0]) { sendError(res, 'Device not found', 'DEVICE_NOT_FOUND', 404); return; }
    await deleteCache(CACHE_KEYS.DEVICE_LIST);
    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    await writeAuditLog({ userId: req.user!.userId, action: 'DEVICE_DELETED', entityType: 'device', entityId: id, ipAddress: req.ip ?? null });
    sendSuccess(res, null, 'Device deleted successfully');
  } catch (err) { next(err); }
}
