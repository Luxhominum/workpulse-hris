import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/rbac';
import { Role } from '@prisma/client';

const router = Router();

// Only ADMIN and MANAGER can access Admin/Payroll dashboards
router.use(authenticate, authorizeRoles(Role.ADMIN, Role.MANAGER));

router.get('/overview', AdminController.getLiveOverview);
router.get('/analytics', AdminController.getMonthlyAnalytics);
router.post('/attendance/adjust', authorizeRoles(Role.ADMIN), AdminController.adjustAttendance);
router.get('/payroll/summary', AdminController.getPayrollSummary);
router.get('/payroll/export', AdminController.exportPayroll);
router.get('/attendance/matrix-data', AdminController.getAttendanceMatrix);
router.get('/attendance/export-matrix', AdminController.exportAttendanceMatrix);

export const adminRoutes = router;
