import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendPaginated } from '../utils/response';
import { getPagination } from '../utils/pagination';

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, offset } = getPagination(req);
    const { userId, entityType, action, dateFrom, dateTo } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (userId) { conditions.push(`al.user_id = $${idx++}`); params.push(userId); }
    if (entityType) { conditions.push(`al.entity_type = $${idx++}`); params.push(entityType); }
    if (action) { conditions.push(`al.action ILIKE $${idx++}`); params.push(`%${action}%`); }
    if (dateFrom) { conditions.push(`al.created_at >= $${idx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`al.created_at <= $${idx++}`); params.push(dateTo); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    params.push(limit, offset);
    const result = await pool.query(`
      SELECT al.*, CONCAT(u.first_name,' ',u.last_name) as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);
    sendPaginated(res, result.rows.map((r) => ({
      id: r.id, userId: r.user_id, userName: r.user_name, userEmail: r.user_email,
      action: r.action, entityType: r.entity_type, entityId: r.entity_id,
      oldValues: r.old_values, newValues: r.new_values,
      ipAddress: r.ip_address, createdAt: r.created_at,
    })), total, page, limit);
  } catch (err) { next(err); }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, offset } = getPagination(req);
    const unreadOnly = req.query['unread'] === 'true';
    const conditions = [`n.user_id = $1`];
    const params: unknown[] = [req.user!.userId];
    if (unreadOnly) conditions.push('n.is_read = false');
    const countRes = await pool.query(`SELECT COUNT(*) FROM notifications n WHERE ${conditions.join(' AND ')}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM notifications n WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    sendPaginated(res, result.rows.map((r) => ({
      id: r.id, userId: r.user_id, type: r.type, title: r.title,
      message: r.message, entityType: r.entity_type, entityId: r.entity_id,
      isRead: r.is_read, createdAt: r.created_at,
    })), total, page, limit);
  } catch (err) { next(err); }
}

export async function markNotificationRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, req.user!.userId]
    );
    sendSuccess(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
}

export async function markAllNotificationsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [req.user!.userId]);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
}

export async function getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`, [req.user!.userId]
    );
    sendSuccess(res, { count: parseInt(result.rows[0].count, 10) });
  } catch (err) { next(err); }
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getDeviceReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { departmentId, status, categoryId } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (departmentId) { conditions.push(`d.department_id = $${idx++}`); params.push(departmentId); }
    if (status) { conditions.push(`d.status = $${idx++}`); params.push(status); }
    if (categoryId) { conditions.push(`d.category_id = $${idx++}`); params.push(categoryId); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`
      SELECT d.device_id, d.asset_number, d.serial_number, d.name,
             c.name as category, d.manufacturer, d.model, d.status, d.risk_level,
             dept.name as department, d.location, d.calibration_required,
             d.last_calibration_date, d.next_calibration_date,
             d.last_maintenance_date, d.warranty_expiry, d.installation_date
      FROM devices d
      LEFT JOIN device_categories c ON d.category_id = c.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      ${where}
      ORDER BY dept.name, d.name
    `, params);
    sendSuccess(res, result.rows);
  } catch (err) { next(err); }
}

export async function getCalibrationReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, dateFrom, dateTo } = req.query as Record<string, string>;
    let where = '';
    const params: unknown[] = [];
    let idx = 1;

    if (type === 'overdue') {
      where = `WHERE d.calibration_required = true AND d.next_calibration_date < CURRENT_DATE AND d.status != 'retired'`;
    } else if (type === 'due') {
      where = `WHERE d.calibration_required = true AND d.next_calibration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND d.status != 'retired'`;
    } else if (type === 'history') {
      const conditions = ['1=1'];
      if (dateFrom) { conditions.push(`c.calibration_date >= $${idx++}`); params.push(dateFrom); }
      if (dateTo) { conditions.push(`c.calibration_date <= $${idx++}`); params.push(dateTo); }
      const result = await pool.query(`
        SELECT c.id, d.name as device, d.asset_number, c.calibration_date,
               c.next_calibration_due_date, c.status, c.certificate_number,
               CONCAT(t.first_name,' ',t.last_name) as technician, c.result, c.remarks
        FROM calibrations c
        JOIN devices d ON c.device_id = d.id
        LEFT JOIN technicians t ON c.technician_id = t.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY c.calibration_date DESC
      `, params);
      sendSuccess(res, result.rows); return;
    }

    const result = await pool.query(`
      SELECT d.device_id, d.asset_number, d.name, d.manufacturer, d.model,
             dept.name as department, d.next_calibration_date, d.last_calibration_date,
             d.calibration_frequency_days, d.risk_level, d.status
      FROM devices d LEFT JOIN departments dept ON d.department_id = dept.id
      ${where}
      ORDER BY d.next_calibration_date
    `, params);
    sendSuccess(res, result.rows);
  } catch (err) { next(err); }
}

export async function getMaintenanceReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { dateFrom, dateTo, technicianId, type } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (dateFrom) { conditions.push(`mr.completion_date >= $${idx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`mr.completion_date <= $${idx++}`); params.push(dateTo); }
    if (technicianId) { conditions.push(`mr.technician_id = $${idx++}`); params.push(technicianId); }
    if (type) { conditions.push(`mr.maintenance_type = $${idx++}`); params.push(type); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`
      SELECT mr.id, d.name as device, d.asset_number, mr.maintenance_type, mr.priority,
             mr.status, mr.scheduled_date, mr.completion_date, mr.cost, mr.downtime_hours,
             CONCAT(t.first_name,' ',t.last_name) as technician,
             mr.problem_description, mr.work_performed, mr.parts_replaced, mr.result
      FROM maintenance_records mr
      JOIN devices d ON mr.device_id = d.id
      LEFT JOIN technicians t ON mr.technician_id = t.id
      ${where}
      ORDER BY mr.created_at DESC
    `, params);
    sendSuccess(res, result.rows);
  } catch (err) { next(err); }
}
