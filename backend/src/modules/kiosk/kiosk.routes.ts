import { Router } from 'express';
import { KioskController } from './kiosk.controller';
import { uploadSinglePhoto } from '../../middlewares/upload';

const router = Router();

// Kiosk routes are accessible by the on-premises tablet/terminal
router.get('/init', KioskController.getInitData);
router.post('/clock-in', uploadSinglePhoto, KioskController.clockIn);
router.post('/clock-out', uploadSinglePhoto, KioskController.clockOut);
router.post('/verify-pin', KioskController.verifyAdminPin);
router.post('/update-pin', KioskController.updatePin);

export const kioskRoutes = router;
