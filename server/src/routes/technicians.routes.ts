import { Router } from 'express';
import { getTechnicians, getTechnicianById, createTechnician, updateTechnician, deleteTechnician } from '../controllers/technicians.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getTechnicians);
router.post('/', authorize('admin'), createTechnician);
router.get('/:id', getTechnicianById);
router.put('/:id', authorize('admin'), updateTechnician);
router.delete('/:id', authorize('admin'), deleteTechnician);

export default router;
