import { Router } from 'express';
import { getCalibrations, getCalibrationById, createCalibration, updateCalibration, deleteCalibration } from '../controllers/calibrations.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getCalibrations);
router.post('/', authorize('admin', 'technician'), createCalibration);
router.get('/:id', getCalibrationById);
router.put('/:id', authorize('admin', 'technician'), updateCalibration);
router.delete('/:id', authorize('admin'), deleteCalibration);

export default router;
