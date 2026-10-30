import { Request, Response, NextFunction } from 'express';
import { OfficesService } from './offices.service';

function getId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class OfficesController {
  static async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const offices = await OfficesService.getAll();
      res.status(200).json({
        success: true,
        data: offices,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const office = await OfficesService.getById(getId(req));
      res.status(200).json({
        success: true,
        data: office,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const office = await OfficesService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Office created successfully',
        data: office,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const office = await OfficesService.update(getId(req), req.body);
      res.status(200).json({
        success: true,
        message: 'Office updated successfully',
        data: office,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await OfficesService.delete(getId(req));
      res.status(200).json({
        success: true,
        message: 'Office deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
