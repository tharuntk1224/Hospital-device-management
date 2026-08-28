import { Router } from 'express';
import {
  getMaintenanceRecords, getMaintenanceById, createMaintenance, updateMaintenance, deleteMaintenance,
  getMaintenanceRequests, createMaintenanceRequest, updateMaintenanceRequest,
} from '../controllers/maintenance.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Maintenance Records
router.get('/', getMaintenanceRecords);
router.post('/', authorize('admin', 'technician'), createMaintenance);
router.get('/:id', getMaintenanceById);
router.put('/:id', authorize('admin', 'technician'), updateMaintenance);
router.delete('/:id', authorize('admin'), deleteMaintenance);

export const maintenanceRequestRouter = Router();
maintenanceRequestRouter.use(authenticate);
maintenanceRequestRouter.get('/', getMaintenanceRequests);
maintenanceRequestRouter.post('/', createMaintenanceRequest);
maintenanceRequestRouter.put('/:id', authorize('admin', 'technician'), updateMaintenanceRequest);

export default router;
