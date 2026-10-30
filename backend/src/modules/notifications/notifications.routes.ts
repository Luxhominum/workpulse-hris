import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/my', NotificationsController.getMyNotifications);
router.patch('/mark-all-read', NotificationsController.markAllAsRead);
router.patch('/:id/read', NotificationsController.markAsRead);

export const notificationRoutes = router;
