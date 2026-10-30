import { Router } from 'express';
import { LeavesController } from './leaves.controller';
import { authenticate } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/rbac';
import { uploadLeaveAttachment } from '../../middlewares/upload';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Employee actions
router.post('/', uploadLeaveAttachment, LeavesController.create);
router.get('/my', LeavesController.getMyLeaves);
router.get('/balance', LeavesController.getBalance);

// Manager / Admin approval actions
router.post('/admin-create', authorizeRoles(Role.ADMIN, Role.MANAGER), uploadLeaveAttachment, LeavesController.adminCreate);
router.get('/pending', authorizeRoles(Role.ADMIN, Role.MANAGER), LeavesController.getPending);
router.get('/', authorizeRoles(Role.ADMIN, Role.MANAGER), LeavesController.getAll);
router.patch('/:id/approve', authorizeRoles(Role.ADMIN, Role.MANAGER), LeavesController.approve);
router.patch('/:id/reject', authorizeRoles(Role.ADMIN, Role.MANAGER), LeavesController.reject);

export const leaveRoutes = router;
