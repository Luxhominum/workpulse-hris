import { Router } from 'express';
import { VisitsController } from './visits.controller';
import { authenticate } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/rbac';
import { Role } from '@prisma/client';
import { uploadSinglePhoto } from '../../middlewares/upload';

const router = Router();

// All visit routes require authentication
router.use(authenticate);

// Employee Sales Check-in at Client/Store
router.post('/check-in', uploadSinglePhoto, VisitsController.checkIn);

// Employee Sales Check-out from Client/Store (notes & closing order)
router.post('/:id/check-out', VisitsController.checkOut);

// Employee personal visits list for today
router.get('/my-visits', VisitsController.getMyVisits);

// Admin / Manager overview across all sales reps
router.get('/admin/overview', authorizeRoles(Role.ADMIN, Role.MANAGER), VisitsController.getAdminOverview);

// Admin / Manager manual create visit (bypass)
router.post('/admin/create', authorizeRoles(Role.ADMIN, Role.MANAGER), uploadSinglePhoto, VisitsController.adminCreate);

// Admin / Manager delete visit
router.delete('/admin/:id', authorizeRoles(Role.ADMIN, Role.MANAGER), VisitsController.adminDelete);

export const visitRoutes = router;
