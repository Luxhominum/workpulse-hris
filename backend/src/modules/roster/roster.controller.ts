import { Request, Response, NextFunction } from 'express';
import { RosterService } from './roster.service';

export class RosterController {
  static async getMonthlyRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const department = req.query.department as string | undefined;

      const data = await RosterService.getMonthlyRoster(year, month, department);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async assignRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employee_ids, shift_id, start_date, end_date, notes } = req.body;
      if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
        res.status(400).json({ success: false, message: 'employee_ids must be a non-empty array' });
        return;
      }
      if (!shift_id || !start_date || !end_date) {
        res.status(400).json({ success: false, message: 'shift_id, start_date, and end_date are required' });
        return;
      }

      const result = await RosterService.assignRoster({
        employee_ids,
        shift_id,
        start_date,
        end_date,
        notes,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async deleteRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employee_id, date } = req.body;
      if (!employee_id || !date) {
        res.status(400).json({ success: false, message: 'employee_id and date are required' });
        return;
      }

      const result = await RosterService.deleteRoster(employee_id, date);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = (req as any).user.id || (req as any).user.userId;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      const schedule = await RosterService.getMySchedule(employeeId, year, month);
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }
}
