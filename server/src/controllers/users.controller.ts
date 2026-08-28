import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { createUserSchema, updateUserSchema } from '../validators/auth.validator';
import { sendSuccess, sendCreated, sendPaginated, sendError } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { writeAuditLog } from '../middleware/auditLogger';

export async function getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, offset } = getPagination(req);
    const search = (req.query['search'] as string) || '';
    const role = (req.query['role'] as string) || '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIdx} OR u.first_name ILIKE $${paramIdx} OR u.last_name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (role) {
      conditions.push(`u.role = $${paramIdx}`);
      params.push(role);
      paramIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
              u.department_id, d.name as department_name, u.is_active, u.created_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    const users = result.rows.map((r) => ({
      id: r.id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      role: r.role,
      departmentId: r.department_id,
      departmentName: r.department_name,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));

    sendPaginated(res, users, total, page, limit);
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
              u.department_id, d.name as department_name, u.is_active, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [id]
    );
    if (!result.rows[0]) {
      sendError(res, 'User not found', 'USER_NOT_FOUND', 404);
      return;
    }
    const r = result.rows[0];
    sendSuccess(res, {
      id: r.id, email: r.email, firstName: r.first_name, lastName: r.last_name,
      role: r.role, departmentId: r.department_id, departmentName: r.department_name,
      isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, department_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, role, department_id, is_active, created_at`,
      [data.email.toLowerCase(), passwordHash, data.firstName, data.lastName, data.role, data.departmentId ?? null, data.isActive]
    );
    const r = result.rows[0];
    const user = { id: r.id, email: r.email, firstName: r.first_name, lastName: r.last_name, role: r.role, departmentId: r.department_id, isActive: r.is_active, createdAt: r.created_at };
    await writeAuditLog({ userId: req.user!.userId, action: 'USER_CREATED', entityType: 'user', entityId: r.id, newValues: user, ipAddress: req.ip ?? null });
    sendCreated(res, user, 'User created successfully');
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const data = updateUserSchema.parse(req.body);
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (data.firstName !== undefined) { fields.push(`first_name = $${idx++}`); params.push(data.firstName); }
    if (data.lastName !== undefined) { fields.push(`last_name = $${idx++}`); params.push(data.lastName); }
    if (data.email !== undefined) { fields.push(`email = $${idx++}`); params.push(data.email.toLowerCase()); }
    if (data.role !== undefined) { fields.push(`role = $${idx++}`); params.push(data.role); }
    if (data.departmentId !== undefined) { fields.push(`department_id = $${idx++}`); params.push(data.departmentId); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); params.push(data.isActive); }
    if (fields.length === 0) { sendError(res, 'No fields to update', 'NO_FIELDS', 400); return; }
    fields.push(`updated_at = NOW()`);
    params.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, first_name, last_name, role, department_id, is_active`,
      params
    );
    if (!result.rows[0]) { sendError(res, 'User not found', 'USER_NOT_FOUND', 404); return; }
    const r = result.rows[0];
    const user = { id: r.id, email: r.email, firstName: r.first_name, lastName: r.last_name, role: r.role, departmentId: r.department_id, isActive: r.is_active };
    await writeAuditLog({ userId: req.user!.userId, action: 'USER_UPDATED', entityType: 'user', entityId: id, newValues: user, ipAddress: req.ip ?? null });
    sendSuccess(res, user, 'User updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    if (id === req.user!.userId) { sendError(res, 'Cannot delete your own account', 'SELF_DELETE', 400); return; }
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) { sendError(res, 'User not found', 'USER_NOT_FOUND', 404); return; }
    await writeAuditLog({ userId: req.user!.userId, action: 'USER_DELETED', entityType: 'user', entityId: id, ipAddress: req.ip ?? null });
    sendSuccess(res, null, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
}
