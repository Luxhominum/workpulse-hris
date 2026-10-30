import { Request, Response, NextFunction } from 'express';
import { ShiftsService } from './shifts.service';

function getId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class ShiftsController {
  static async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shifts = await ShiftsService.getAll();
      res.status(200).json({
        success: true,
        data: shifts,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shift = await ShiftsService.getById(getId(req));
      res.status(200).json({
        success: true,
        data: shift,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shift = await ShiftsService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Shift created successfully',
        data: shift,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shift = await ShiftsService.update(getId(req), req.body);
      res.status(200).json({
        success: true,
        message: 'Shift updated successfully',
        data: shift,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ShiftsService.delete(getId(req));
      res.status(200).json({
        success: true,
        message: 'Shift deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
