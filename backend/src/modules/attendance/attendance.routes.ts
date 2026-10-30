import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate } from '../../middlewares/auth';
import { uploadSinglePhoto } from '../../middlewares/upload';
import { attendanceRateLimiter } from '../../middlewares/security';

const router = Router();

// All attendance routes require valid employee JWT authentication
router.use(authenticate);

// Clock In & Clock Out
router.post('/clock-in', attendanceRateLimiter, uploadSinglePhoto, AttendanceController.clockIn);
router.post('/clock-out', attendanceRateLimiter, uploadSinglePhoto, AttendanceController.clockOut);

// Today's Status & Personal History
router.get('/today', AttendanceController.getToday);
router.get('/my-history', AttendanceController.getMyHistory);
router.get('/my-payslip', AttendanceController.getMyPayslip);

export const attendanceRoutes = router;
