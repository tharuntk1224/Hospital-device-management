import { Router } from 'express';
import {
  getAuditLogs, getNotifications, markNotificationRead, markAllNotificationsRead,
  getUnreadCount, getDeviceReport, getCalibrationReport, getMaintenanceReport,
} from '../controllers/reports.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Audit Logs
router.get('/audit-logs', authorize('admin', 'auditor'), getAuditLogs);

// Notifications
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/mark-all-read', markAllNotificationsRead);

// Reports
router.get('/reports/devices', getDeviceReport);
router.get('/reports/calibration', getCalibrationReport);
router.get('/reports/maintenance', getMaintenanceReport);

export default router;
