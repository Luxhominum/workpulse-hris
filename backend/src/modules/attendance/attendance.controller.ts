import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { clockInSchema, clockOutSchema } from './attendance.schema';

export class AttendanceController {
  static async clockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = clockInSchema.parse(req.body);
      const result = await AttendanceService.clockIn(
        req.user!.id,
        validatedData,
        req.file
      );

      res.status(201).json({
        success: true,
        message: 'Clock-in successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async clockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = clockOutSchema.parse(req.body);
      const result = await AttendanceService.clockOut(
        req.user!.id,
        validatedData,
        req.file
      );

      res.status(200).json({
        success: true,
        message: 'Clock-out successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await AttendanceService.getTodayAttendance(req.user!.id);
      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 60;
      const month = req.query.month as string | undefined;
      const history = await AttendanceService.getMyHistory(req.user!.id, limit, month);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyPayslip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
      const payslip = await AttendanceService.getMyPayslip(req.user!.id, year, month);
      res.status(200).json({
        success: true,
        data: payslip,
      });
    } catch (error) {
      next(error);
    }
  }
}
