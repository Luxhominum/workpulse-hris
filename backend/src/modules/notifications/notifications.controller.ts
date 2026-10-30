import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';

export class NotificationsController {
  static async getMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await NotificationsService.getMyNotifications(req.user!.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const targetId = Array.isArray(id) ? id[0] : id;
      await NotificationsService.markAsRead(targetId, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationsService.markAllAsRead(req.user!.id);
      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }
}
