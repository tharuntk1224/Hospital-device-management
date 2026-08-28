import { Router } from 'express';
import { getDashboardStats, getCalibrationAlerts, getComplianceStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/statistics', getDashboardStats);
router.get('/calibration-alerts', getCalibrationAlerts);
router.get('/compliance', getComplianceStats);

export default router;
