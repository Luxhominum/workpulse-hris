import { Router } from 'express';
import { OvertimeController } from './overtime.controller';
import { authenticate } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/rbac';
import { Role } from '@prisma/client';

const router = Router();

// All overtime routes require authentication
router.use(authenticate);

// Employee routes
router.post('/', OvertimeController.create);
router.get('/my', OvertimeController.getMyOvertimes);
router.delete('/:id', OvertimeController.cancel);

// Manager / Admin routes
router.get('/', authorizeRoles(Role.ADMIN, Role.MANAGER), OvertimeController.getAll);
router.post('/:id/approve', authorizeRoles(Role.ADMIN, Role.MANAGER), OvertimeController.approve);
router.post('/:id/reject', authorizeRoles(Role.ADMIN, Role.MANAGER), OvertimeController.reject);

export const overtimeRoutes = router;
