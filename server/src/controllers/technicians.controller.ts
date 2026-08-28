import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { z } from 'zod';

const technicianSchema = z.object({
  employeeId: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).nullable().optional(),
  specialization: z.string().max(200).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  certification: z.string().max(200).nullable().optional(),
  certificationExpiry: z.string().datetime().nullable().optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
  userId: z.string().uuid().nullable().optional(),
});

function mapTech(r: Record<string, unknown>) {
  return {
    id: r['id'], employeeId: r['employee_id'], firstName: r['first_name'], lastName: r['last_name'],
    fullName: `${r['first_name']} ${r['last_name']}`,
    email: r['email'], phone: r['phone'], specialization: r['specialization'],
    departmentId: r['department_id'], departmentName: r['department_name'],
    certification: r['certification'], certificationExpiry: r['certification_expiry'],
    status: r['status'], userId: r['user_id'], createdAt: r['created_at'],
  };
}

const BASE = `
  SELECT t.*, d.name as department_name
  FROM technicians t
  LEFT JOIN departments d ON t.department_id = d.id
`;

export async function getTechnicians(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = (req.query['search'] as string) || '';
    const status = (req.query['status'] as string) || '';
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (search) {
      conditions.push(`(t.first_name ILIKE $${idx} OR t.last_name ILIKE $${idx} OR t.employee_id ILIKE $${idx} OR t.email ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`${BASE} ${where} ORDER BY t.first_name`, params);

    // Enrich with workload stats
    const techs = await Promise.all(result.rows.map(async (r) => {
      const [pending, completed, calCount] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM maintenance_records WHERE technician_id = $1 AND status IN ('scheduled','in_progress')`, [r.id]),
        pool.query(`SELECT COUNT(*) FROM maintenance_records WHERE technician_id = $1 AND status = 'completed' AND completion_date >= NOW() - INTERVAL '30 days'`, [r.id]),
        pool.query(`SELECT COUNT(*) FROM calibrations WHERE technician_id = $1 AND status IN ('scheduled','in_progress')`, [r.id]),
      ]);
      return {
        ...mapTech(r),
        pendingMaintenance: parseInt(pending.rows[0].count, 10),
        completedMaintenanceMonth: parseInt(completed.rows[0].count, 10),
        calibrationWorkload: parseInt(calCount.rows[0].count, 10),
      };
    }));

    sendSuccess(res, techs);
  } catch (err) { next(err); }
}

export async function getTechnicianById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const result = await pool.query(`${BASE} WHERE t.id = $1`, [id]);
    if (!result.rows[0]) { sendError(res, 'Technician not found', 'TECH_NOT_FOUND', 404); return; }

    const [devices, maint, cals] = await Promise.all([
      pool.query(`SELECT d.id, d.name, d.device_id, d.asset_number, d.status FROM devices d WHERE d.technician_id = $1 ORDER BY d.name`, [id]),
      pool.query(`SELECT mr.id, mr.status, mr.maintenance_type, mr.scheduled_date, d.name as device_name FROM maintenance_records mr JOIN devices d ON mr.device_id = d.id WHERE mr.technician_id = $1 ORDER BY mr.scheduled_date DESC LIMIT 10`, [id]),
      pool.query(`SELECT c.id, c.status, c.calibration_date, d.name as device_name FROM calibrations c JOIN devices d ON c.device_id = d.id WHERE c.technician_id = $1 ORDER BY c.calibration_date DESC LIMIT 10`, [id]),
    ]);

    sendSuccess(res, {
      ...mapTech(result.rows[0]),
      assignedDevices: devices.rows,
      recentMaintenance: maint.rows,
      recentCalibrations: cals.rows,
    });
  } catch (err) { next(err); }
}

export async function createTechnician(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = technicianSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO technicians (employee_id, first_name, last_name, email, phone, specialization, department_id, certification, certification_expiry, status, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [data.employeeId, data.firstName, data.lastName, data.email, data.phone ?? null,
       data.specialization ?? null, data.departmentId ?? null, data.certification ?? null,
       data.certificationExpiry ?? null, data.status, data.userId ?? null]
    );
    sendCreated(res, mapTech(result.rows[0]), 'Technician created');
  } catch (err) { next(err); }
}

export async function updateTechnician(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const data = technicianSchema.partial().parse(req.body);
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    const map: Record<string, string> = {
      employeeId: 'employee_id', firstName: 'first_name', lastName: 'last_name', email: 'email',
      phone: 'phone', specialization: 'specialization', departmentId: 'department_id',
      certification: 'certification', certificationExpiry: 'certification_expiry', status: 'status', userId: 'user_id',
    };
    for (const [key, col] of Object.entries(map)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${col} = $${idx++}`); params.push((data as Record<string, unknown>)[key]);
      }
    }
    if (!fields.length) { sendError(res, 'No fields', 'NO_FIELDS', 400); return; }
    fields.push('updated_at = NOW()');
    params.push(id);
    const result = await pool.query(`UPDATE technicians SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!result.rows[0]) { sendError(res, 'Technician not found', 'TECH_NOT_FOUND', 404); return; }
    sendSuccess(res, mapTech(result.rows[0]), 'Technician updated');
  } catch (err) { next(err); }
}

export async function deleteTechnician(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const result = await pool.query('DELETE FROM technicians WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) { sendError(res, 'Technician not found', 'TECH_NOT_FOUND', 404); return; }
    sendSuccess(res, null, 'Technician deleted');
  } catch (err) { next(err); }
}
