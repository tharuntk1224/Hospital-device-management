import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { writeAuditLog } from '../middleware/auditLogger';
import { z } from 'zod';

const departmentSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(500).nullable().optional(),
  headName: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function getDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT d.id, d.name, d.code, d.description, d.head_name, d.phone, d.is_active, d.created_at,
              COUNT(dev.id) as device_count
       FROM departments d
       LEFT JOIN devices dev ON d.id = dev.department_id AND dev.status != 'retired'
       GROUP BY d.id
       ORDER BY d.name`
    );
    sendSuccess(res, result.rows.map((r) => ({
      id: r.id, name: r.name, code: r.code, description: r.description,
      headName: r.head_name, phone: r.phone, isActive: r.is_active,
      createdAt: r.created_at, deviceCount: parseInt(r.device_count, 10),
    })));
  } catch (err) { next(err); }
}

export async function createDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = departmentSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO departments (name, code, description, head_name, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.code, data.description ?? null, data.headName ?? null, data.phone ?? null, data.isActive]
    );
    const r = result.rows[0];
    const dept = { id: r.id, name: r.name, code: r.code, description: r.description, headName: r.head_name, phone: r.phone, isActive: r.is_active, createdAt: r.created_at };
    await writeAuditLog({ userId: req.user!.userId, action: 'DEPARTMENT_CREATED', entityType: 'department', entityId: r.id, newValues: dept, ipAddress: req.ip ?? null });
    sendCreated(res, dept, 'Department created successfully');
  } catch (err) { next(err); }
}

export async function updateDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const data = departmentSchema.partial().parse(req.body);
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (data.name !== undefined) { fields.push(`name = $${idx++}`); params.push(data.name); }
    if (data.code !== undefined) { fields.push(`code = $${idx++}`); params.push(data.code); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); params.push(data.description); }
    if (data.headName !== undefined) { fields.push(`head_name = $${idx++}`); params.push(data.headName); }
    if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); params.push(data.phone); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); params.push(data.isActive); }
    if (fields.length === 0) { sendError(res, 'No fields to update', 'NO_FIELDS', 400); return; }
    fields.push(`updated_at = NOW()`);
    params.push(id);
    const result = await pool.query(
      `UPDATE departments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params
    );
    if (!result.rows[0]) { sendError(res, 'Department not found', 'DEPT_NOT_FOUND', 404); return; }
    const r = result.rows[0];
    sendSuccess(res, { id: r.id, name: r.name, code: r.code, description: r.description, headName: r.head_name, phone: r.phone, isActive: r.is_active }, 'Department updated');
  } catch (err) { next(err); }
}

export async function deleteDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const devCount = await pool.query('SELECT COUNT(*) FROM devices WHERE department_id = $1', [id]);
    if (parseInt(devCount.rows[0].count, 10) > 0) {
      sendError(res, 'Cannot delete department with assigned devices', 'DEPT_HAS_DEVICES', 400); return;
    }
    const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) { sendError(res, 'Department not found', 'DEPT_NOT_FOUND', 404); return; }
    await writeAuditLog({ userId: req.user!.userId, action: 'DEPARTMENT_DELETED', entityType: 'department', entityId: id, ipAddress: req.ip ?? null });
    sendSuccess(res, null, 'Department deleted successfully');
  } catch (err) { next(err); }
}
