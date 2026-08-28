import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { getCache, setCache, CACHE_TTL, CACHE_KEYS } from '../config/redis';
import { getCalibrationDueStatus } from '../utils/calibrationStatus';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // Try Redis cache first
    const cached = await getCache<unknown>(CACHE_KEYS.DASHBOARD_STATS);
    if (cached) {
      sendSuccess(res, cached, 'Dashboard stats (cached)');
      return;
    }

    const [
      deviceStats, calStats, maintStats, techCount,
      devicesByDept, devicesByCat, monthlyMaint, upcomingCals,
    ] = await Promise.all([
      // Device counts by status
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'under_maintenance') as under_maintenance,
          COUNT(*) FILTER (WHERE status = 'out_of_service') as out_of_service,
          COUNT(*) FILTER (WHERE status = 'retired') as retired,
          COUNT(*) FILTER (WHERE calibration_required = true) as requires_calibration
        FROM devices WHERE status != 'retired'
      `),
      // Calibration overdue/due counts
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE next_calibration_date < CURRENT_DATE AND calibration_required = true) as overdue,
          COUNT(*) FILTER (WHERE next_calibration_date = CURRENT_DATE AND calibration_required = true) as due_today,
          COUNT(*) FILTER (WHERE next_calibration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND calibration_required = true) as due_soon,
          COUNT(*) FILTER (WHERE next_calibration_date > CURRENT_DATE + INTERVAL '7 days' AND calibration_required = true) as valid
        FROM devices WHERE status != 'retired'
      `),
      // Maintenance stats
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('requested','approved')) as pending_requests,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed' AND completion_date >= DATE_TRUNC('month', NOW())) as completed_this_month
        FROM maintenance_records
      `),
      // Technician count
      pool.query(`SELECT COUNT(*) FROM technicians WHERE status = 'active'`),
      // Devices by department
      pool.query(`
        SELECT dept.name, COUNT(d.id) as count
        FROM departments dept
        LEFT JOIN devices d ON dept.id = d.department_id AND d.status != 'retired'
        GROUP BY dept.id, dept.name ORDER BY count DESC LIMIT 8
      `),
      // Devices by category
      pool.query(`
        SELECT c.name, COUNT(d.id) as count
        FROM device_categories c
        LEFT JOIN devices d ON c.id = d.category_id AND d.status != 'retired'
        GROUP BY c.id, c.name ORDER BY count DESC LIMIT 8
      `),
      // Monthly maintenance activity (last 6 months)
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', COALESCE(completion_date, scheduled_date, created_at)), 'Mon YYYY') as month,
               COUNT(*) as total,
               COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM maintenance_records
        WHERE COALESCE(completion_date, scheduled_date, created_at) >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', COALESCE(completion_date, scheduled_date, created_at))
        ORDER BY DATE_TRUNC('month', COALESCE(completion_date, scheduled_date, created_at))
      `),
      // Upcoming calibrations (next 30 days)
      pool.query(`
        SELECT d.id, d.name, d.asset_number, d.next_calibration_date,
               dept.name as department_name
        FROM devices d
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE d.calibration_required = true
          AND d.next_calibration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          AND d.status != 'retired'
        ORDER BY d.next_calibration_date
        LIMIT 10
      `),
    ]);

    const ds = deviceStats.rows[0];
    const cs = calStats.rows[0];
    const ms = maintStats.rows[0];

    const requiresCalibration = parseInt(ds.requires_calibration, 10);
    const validCal = parseInt(cs.valid, 10);
    const calibrationCompliance = requiresCalibration > 0
      ? Math.round((validCal / requiresCalibration) * 100)
      : 100;

    const upcomingCalsWithStatus = upcomingCals.rows.map((r) => ({
      ...r,
      dueStatus: getCalibrationDueStatus(r.next_calibration_date ? new Date(r.next_calibration_date) : null, true),
    }));

    const stats = {
      devices: {
        total: parseInt(ds.total, 10),
        active: parseInt(ds.active, 10),
        underMaintenance: parseInt(ds.under_maintenance, 10),
        outOfService: parseInt(ds.out_of_service, 10),
        retired: parseInt(ds.retired, 10),
      },
      calibration: {
        overdue: parseInt(cs.overdue, 10),
        dueToday: parseInt(cs.due_today, 10),
        dueSoon: parseInt(cs.due_soon, 10),
        valid: validCal,
        compliancePercent: calibrationCompliance,
      },
      maintenance: {
        pendingRequests: parseInt(ms.pending_requests, 10),
        inProgress: parseInt(ms.in_progress, 10),
        completedThisMonth: parseInt(ms.completed_this_month, 10),
      },
      totalActiveTechnicians: parseInt(techCount.rows[0].count, 10),
      charts: {
        devicesByDepartment: devicesByDept.rows.map((r) => ({ name: r.name, value: parseInt(r.count, 10) })),
        devicesByCategory: devicesByCat.rows.map((r) => ({ name: r.name, value: parseInt(r.count, 10) })),
        monthlyMaintenance: monthlyMaint.rows.map((r) => ({ month: r.month, total: parseInt(r.total, 10), completed: parseInt(r.completed, 10) })),
      },
      upcomingCalibrations: upcomingCalsWithStatus,
      generatedAt: new Date().toISOString(),
    };

    await setCache(CACHE_KEYS.DASHBOARD_STATS, stats, CACHE_TTL.DASHBOARD);
    sendSuccess(res, stats, 'Dashboard stats');
  } catch (err) { next(err); }
}

export async function getCalibrationAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT d.id, d.name, d.asset_number, d.device_id, d.next_calibration_date,
             dept.name as department_name, d.risk_level
      FROM devices d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.calibration_required = true
        AND d.next_calibration_date <= CURRENT_DATE + INTERVAL '30 days'
        AND d.status != 'retired'
      ORDER BY d.next_calibration_date ASC
      LIMIT 50
    `);

    const alerts = result.rows.map((r) => {
      const nextDate = r.next_calibration_date ? new Date(r.next_calibration_date) : null;
      const dueStatus = getCalibrationDueStatus(nextDate, true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntil = nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / 86400000) : -9999;
      return { ...r, dueStatus, daysUntilDue: daysUntil };
    });

    sendSuccess(res, alerts);
  } catch (err) { next(err); }
}

export async function getComplianceStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const cached = await getCache<unknown>(CACHE_KEYS.COMPLIANCE);
    if (cached) { sendSuccess(res, cached); return; }

    const [calCompliance, maintCompliance, failedCals, missingMaint] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE calibration_required = true) as total_requiring,
          COUNT(*) FILTER (WHERE calibration_required = true AND next_calibration_date > CURRENT_DATE) as valid,
          COUNT(*) FILTER (WHERE calibration_required = true AND next_calibration_date < CURRENT_DATE) as overdue,
          COUNT(*) FILTER (WHERE calibration_required = true AND next_calibration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) as expiring_soon
        FROM devices WHERE status != 'retired'
      `),
      pool.query(`
        SELECT COUNT(*) as completed_this_year
        FROM maintenance_records
        WHERE status = 'completed' AND completion_date >= DATE_TRUNC('year', NOW())
      `),
      pool.query(`SELECT COUNT(*) FROM calibrations WHERE status = 'failed' AND calibration_date >= NOW() - INTERVAL '90 days'`),
      pool.query(`
        SELECT COUNT(*) FROM devices d
        WHERE d.status = 'active' AND d.calibration_required = true
          AND NOT EXISTS (
            SELECT 1 FROM calibrations c WHERE c.device_id = d.id AND c.calibration_date >= NOW() - INTERVAL '1 year'
          )
      `),
    ]);

    const cc = calCompliance.rows[0];
    const totalReq = parseInt(cc.total_requiring, 10);
    const valid = parseInt(cc.valid, 10);
    const compliancePct = totalReq > 0 ? Math.round((valid / totalReq) * 100) : 100;

    const stats = {
      calibration: {
        totalRequiring: totalReq,
        valid, overdue: parseInt(cc.overdue, 10),
        expiringSoon: parseInt(cc.expiring_soon, 10),
        compliancePercent: compliancePct,
      },
      maintenance: {
        completedThisYear: parseInt(maintCompliance.rows[0].completed_this_year, 10),
      },
      failedCalibrationsLast90Days: parseInt(failedCals.rows[0].count, 10),
      devicesWithNoCalibrationThisYear: parseInt(missingMaint.rows[0].count, 10),
    };

    await setCache(CACHE_KEYS.COMPLIANCE, stats, CACHE_TTL.COMPLIANCE);
    sendSuccess(res, stats, 'Compliance stats');
  } catch (err) { next(err); }
}
