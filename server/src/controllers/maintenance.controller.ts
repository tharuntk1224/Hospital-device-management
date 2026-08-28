import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { createMaintenanceSchema, updateMaintenanceSchema, createMaintenanceRequestSchema, updateMaintenanceRequestSchema } from '../validators/maintenance.validator';
import { sendSuccess, sendCreated, sendPaginated, sendError } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { writeAuditLog } from '../middleware/auditLogger';
import { deleteCache, CACHE_KEYS } from '../config/redis';

const MAINT_BASE = `
  SELECT mr.*, d.name as device_name, d.asset_number as device_asset_number,
         CONCAT(t.first_name,' ',t.last_name) as technician_name
  FROM maintenance_records mr
  JOIN devices d ON mr.device_id = d.id
  LEFT JOIN technicians t ON mr.technician_id = t.id
`;

function mapMaint(r: Record<string, unknown>) {
  return {
    id: r['id'], deviceId: r['device_id'], deviceName: r['device_name'],
    deviceAssetNumber: r['device_asset_number'],
    maintenanceType: r['maintenance_type'], priority: r['priority'],
    requestDate: r['request_date'], scheduledDate: r['scheduled_date'],
    startDate: r['start_date'], completionDate: r['completion_date'],
    technicianId: r['technician_id'], technicianName: r['technician_name'],
    problemDescription: r['problem_description'], workPerformed: r['work_performed'],
    partsReplaced: r['parts_replaced'], cost: r['cost'], downtimeHours: r['downtime_hours'],
    result: r['result'], remarks: r['remarks'], status: r['status'],
    createdById: r['created_by_id'], createdAt: r['created_at'], updatedAt: r['updated_at'],
  };
}

// ─── Maintenance Records ───────────────────────────────────────────────────────

export async function getMaintenanceRecords(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, deviceId, technicianId, type, status, priority, dateFrom, dateTo } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (search) { conditions.push(`(d.name ILIKE $${idx} OR d.asset_number ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (deviceId) { conditions.push(`mr.device_id = $${idx++}`); params.push(deviceId); }
    if (technicianId) { conditions.push(`mr.technician_id = $${idx++}`); params.push(technicianId); }
    if (type) { conditions.push(`mr.maintenance_type = $${idx++}`); params.push(type); }
    if (status) { conditions.push(`mr.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`mr.priority = $${idx++}`); params.push(priority); }
    if (dateFrom) { conditions.push(`mr.scheduled_date >= $${idx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`mr.scheduled_date <= $${idx++}`); params.push(dateTo); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM maintenance_records mr JOIN devices d ON mr.device_id = d.id ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    params.push(limit, offset);
    const result = await pool.query(`${MAINT_BASE} ${where} ORDER BY mr.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, params);
    sendPaginated(res, result.rows.map(mapMaint), total, page, limit);
  } catch (err) { next(err); }
}

export async function getMaintenanceById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const result = await pool.query(`${MAINT_BASE} WHERE mr.id = $1`, [id]);
    if (!result.rows[0]) { sendError(res, 'Maintenance record not found', 'MAINT_NOT_FOUND', 404); return; }
    sendSuccess(res, mapMaint(result.rows[0]));
  } catch (err) { next(err); }
}

export async function createMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createMaintenanceSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO maintenance_records (
        device_id, maintenance_type, priority, request_date, scheduled_date,
        start_date, completion_date, technician_id, problem_description,
        work_performed, parts_replaced, cost, downtime_hours, result, remarks, status, created_by_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        data.deviceId, data.maintenanceType, data.priority,
        data.requestDate ?? null, data.scheduledDate ?? null,
        data.startDate ?? null, data.completionDate ?? null,
        data.technicianId ?? null, data.problemDescription ?? null,
        data.workPerformed ?? null, data.partsReplaced ?? null,
        data.cost ?? null, data.downtimeHours ?? null,
        data.result ?? null, data.remarks ?? null, data.status,
        req.user!.userId,
      ]
    );
    // Update device status
    if (data.status === 'in_progress' || data.status === 'scheduled') {
      await pool.query(`UPDATE devices SET status = 'under_maintenance', updated_at = NOW() WHERE id = $1`, [data.deviceId]);
    }
    if (data.status === 'completed' && data.completionDate) {
      await pool.query(
        `UPDATE devices SET status = 'active', last_maintenance_date = $1, updated_at = NOW() WHERE id = $2`,
        [data.completionDate, data.deviceId]
      );
    }
    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    await writeAuditLog({ userId: req.user!.userId, action: 'MAINTENANCE_CREATED', entityType: 'maintenance', entityId: result.rows[0].id, newValues: { deviceId: data.deviceId, type: data.maintenanceType, status: data.status }, ipAddress: req.ip ?? null });
    sendCreated(res, mapMaint(result.rows[0]), 'Maintenance record created');
  } catch (err) { next(err); }
}

export async function updateMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const data = updateMaintenanceSchema.parse(req.body);
    const colMap: Record<string, string> = {
      maintenanceType: 'maintenance_type', priority: 'priority',
      requestDate: 'request_date', scheduledDate: 'scheduled_date',
      startDate: 'start_date', completionDate: 'completion_date',
      technicianId: 'technician_id', problemDescription: 'problem_description',
      workPerformed: 'work_performed', partsReplaced: 'parts_replaced',
      cost: 'cost', downtimeHours: 'downtime_hours',
      result: 'result', remarks: 'remarks', status: 'status',
    };
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [key, col] of Object.entries(colMap)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${col} = $${idx++}`); params.push((data as Record<string, unknown>)[key]);
      }
    }
    if (!fields.length) { sendError(res, 'No fields', 'NO_FIELDS', 400); return; }
    fields.push('updated_at = NOW()');
    params.push(id);
    const result = await pool.query(`UPDATE maintenance_records SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *, device_id`, params);
    if (!result.rows[0]) { sendError(res, 'Record not found', 'MAINT_NOT_FOUND', 404); return; }
    const rec = result.rows[0];
    if (data.status === 'completed' && data.completionDate) {
      await pool.query(`UPDATE devices SET status = 'active', last_maintenance_date = $1, updated_at = NOW() WHERE id = $2`, [data.completionDate, rec.device_id]);
    }
    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    await writeAuditLog({ userId: req.user!.userId, action: 'MAINTENANCE_UPDATED', entityType: 'maintenance', entityId: id, newValues: data as Record<string, unknown>, ipAddress: req.ip ?? null });
    sendSuccess(res, mapMaint(rec), 'Maintenance updated');
  } catch (err) { next(err); }
}

export async function deleteMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const result = await pool.query('DELETE FROM maintenance_records WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) { sendError(res, 'Record not found', 'MAINT_NOT_FOUND', 404); return; }
    sendSuccess(res, null, 'Maintenance record deleted');
  } catch (err) { next(err); }
}

// ─── Maintenance Requests ─────────────────────────────────────────────────────

const REQ_BASE = `
  SELECT mr.*, d.name as device_name, d.asset_number,
         CONCAT(u.first_name,' ',u.last_name) as requester_name,
         dept.name as department_name
  FROM maintenance_requests mr
  JOIN devices d ON mr.device_id = d.id
  JOIN users u ON mr.requester_id = u.id
  LEFT JOIN departments dept ON mr.department_id = dept.id
`;

export async function getMaintenanceRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, priority, departmentId } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    // Staff see only their department
    if (req.user!.role === 'staff' && req.user!.departmentId) {
      conditions.push(`mr.department_id = $${idx++}`); params.push(req.user!.departmentId);
    }
    if (status) { conditions.push(`mr.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`mr.priority = $${idx++}`); params.push(priority); }
    if (departmentId) { conditions.push(`mr.department_id = $${idx++}`); params.push(departmentId); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM maintenance_requests mr ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    params.push(limit, offset);
    const result = await pool.query(`${REQ_BASE} ${where} ORDER BY mr.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, params);
    sendPaginated(res, result.rows.map((r) => ({
      id: r.id, deviceId: r.device_id, deviceName: r.device_name, assetNumber: r.asset_number,
      requesterId: r.requester_id, requesterName: r.requester_name,
      departmentId: r.department_id, departmentName: r.department_name,
      problemDescription: r.problem_description, priority: r.priority,
      requestDate: r.request_date, status: r.status,
      maintenanceRecordId: r.maintenance_record_id, createdAt: r.created_at,
    })), total, page, limit);
  } catch (err) { next(err); }
}

export async function createMaintenanceRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createMaintenanceRequestSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO maintenance_requests (device_id, requester_id, department_id, problem_description, priority, request_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,'requested') RETURNING *`,
      [data.deviceId, req.user!.userId, data.departmentId, data.problemDescription, data.priority, data.requestDate ?? new Date()]
    );
    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    await writeAuditLog({ userId: req.user!.userId, action: 'MAINTENANCE_REQUEST_CREATED', entityType: 'maintenance_request', entityId: result.rows[0].id, ipAddress: req.ip ?? null });
    sendCreated(res, result.rows[0], 'Maintenance request submitted');
  } catch (err) { next(err); }
}

export async function updateMaintenanceRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const data = updateMaintenanceRequestSchema.parse(req.body);
    const result = await pool.query(
      `UPDATE maintenance_requests SET status = $1, maintenance_record_id = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [data.status, data.maintenanceRecordId ?? null, id]
    );
    if (!result.rows[0]) { sendError(res, 'Request not found', 'REQ_NOT_FOUND', 404); return; }
    await deleteCache(CACHE_KEYS.DASHBOARD_STATS);
    sendSuccess(res, result.rows[0], 'Request updated');
  } catch (err) { next(err); }
}
