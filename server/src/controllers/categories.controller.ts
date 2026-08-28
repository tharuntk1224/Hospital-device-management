import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function getCategories(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.is_active, c.created_at,
              COUNT(d.id) as device_count
       FROM device_categories c
       LEFT JOIN devices d ON c.id = d.category_id
       GROUP BY c.id ORDER BY c.name`
    );
    sendSuccess(res, result.rows.map((r) => ({
      id: r.id, name: r.name, description: r.description, isActive: r.is_active,
      createdAt: r.created_at, deviceCount: parseInt(r.device_count, 10),
    })));
  } catch (err) { next(err); }
}

export async function createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = categorySchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO device_categories (name, description, is_active) VALUES ($1, $2, $3) RETURNING *`,
      [data.name, data.description ?? null, data.isActive]
    );
    const r = result.rows[0];
    sendCreated(res, { id: r.id, name: r.name, description: r.description, isActive: r.is_active, createdAt: r.created_at }, 'Category created');
  } catch (err) { next(err); }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const data = categorySchema.partial().parse(req.body);
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (data.name !== undefined) { fields.push(`name = $${idx++}`); params.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); params.push(data.description); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); params.push(data.isActive); }
    if (fields.length === 0) { sendError(res, 'No fields to update', 'NO_FIELDS', 400); return; }
    fields.push('updated_at = NOW()');
    params.push(id);
    const result = await pool.query(`UPDATE device_categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!result.rows[0]) { sendError(res, 'Category not found', 'CAT_NOT_FOUND', 404); return; }
    const r = result.rows[0];
    sendSuccess(res, { id: r.id, name: r.name, description: r.description, isActive: r.is_active });
  } catch (err) { next(err); }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const devCount = await pool.query('SELECT COUNT(*) FROM devices WHERE category_id = $1', [id]);
    if (parseInt(devCount.rows[0].count, 10) > 0) {
      sendError(res, 'Cannot delete category with assigned devices', 'CAT_HAS_DEVICES', 400); return;
    }
    const result = await pool.query('DELETE FROM device_categories WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) { sendError(res, 'Category not found', 'CAT_NOT_FOUND', 404); return; }
    sendSuccess(res, null, 'Category deleted');
  } catch (err) { next(err); }
}
