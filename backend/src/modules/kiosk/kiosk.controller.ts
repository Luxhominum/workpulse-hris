import { Request, Response, NextFunction } from 'express';
import { KioskService } from './kiosk.service';

export class KioskController {
  static async getInitData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const officeId = req.query.office_id as string | undefined;
      const data = await KioskService.getKioskInitData(officeId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async clockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employee_id, pin, office_id, client_timestamp } = req.body;
      const result = await KioskService.checkInKiosk(
        employee_id,
        pin,
        req.file,
        office_id,
        client_timestamp
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async clockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employee_id, pin, office_id, client_timestamp } = req.body;
      const result = await KioskService.checkOutKiosk(
        employee_id,
        pin,
        req.file,
        office_id,
        client_timestamp
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyAdminPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pin } = req.body;
      const result = KioskService.verifyAdminPin(pin);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employee_id, old_pin, new_pin } = req.body;
      const result = await KioskService.updateEmployeePin(employee_id, old_pin, new_pin);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
