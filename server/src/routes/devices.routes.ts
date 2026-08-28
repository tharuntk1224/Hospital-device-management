import { Router } from 'express';
import { getDevices, getDeviceById, createDevice, updateDevice, deleteDevice } from '../controllers/devices.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getDevices);
router.post('/', authorize('admin', 'technician'), createDevice);
router.get('/:id', getDeviceById);
router.put('/:id', authorize('admin', 'technician'), updateDevice);
router.delete('/:id', authorize('admin'), deleteDevice);

export default router;
