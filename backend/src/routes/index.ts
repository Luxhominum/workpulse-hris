import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { officeRoutes } from '../modules/offices/offices.routes';
import { shiftRoutes } from '../modules/shifts/shifts.routes';
import { employeeRoutes } from '../modules/employees/employees.routes';
import { attendanceRoutes } from '../modules/attendance/attendance.routes';
import { leaveRoutes } from '../modules/leaves/leaves.routes';
import { adminRoutes } from '../modules/admin/admin.routes';
import { rosterRoutes } from '../modules/roster/roster.routes';
import { kioskRoutes } from '../modules/kiosk/kiosk.routes';
import { overtimeRoutes } from '../modules/overtime/overtime.routes';
import { visitRoutes } from '../modules/visits/visits.routes';
import { auditRoutes } from '../modules/audit/audit.routes';
import { notificationRoutes } from '../modules/notifications/notifications.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hris-attendance-api',
  });
});

router.use('/auth', authRoutes);
router.use('/offices', officeRoutes);
router.use('/shifts', shiftRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/admin', adminRoutes);
router.use('/roster', rosterRoutes);
router.use('/kiosk', kioskRoutes);
router.use('/overtime', overtimeRoutes);
router.use('/visits', visitRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/notifications', notificationRoutes);

export const apiRouter = router;
