import { Request, Response, NextFunction } from 'express';
import { VisitsService } from './visits.service';

export class VisitsController {
  static async checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = (req as any).user.id;
      const {
        client_name,
        client_address,
        contact_person,
        contact_phone,
        latitude,
        longitude,
        visit_purpose,
      } = req.body;

      const visit = await VisitsService.checkIn(
        employeeId,
        {
          client_name,
          client_address,
          contact_person,
          contact_phone,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          visit_purpose,
        },
        req.file
      );

      res.status(201).json({
        success: true,
        message: `Berhasil check-in di ${visit.client_name}`,
        data: visit,
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = (req as any).user.id;
      const { id } = req.params;
      const { notes, order_amount } = req.body;

      const visit = await VisitsService.checkOut(String(id), employeeId, {
        notes,
        order_amount: order_amount !== undefined ? parseFloat(order_amount) : undefined,
      });

      res.status(200).json({
        success: true,
        message: `Kunjungan di ${visit.client_name} selesai (${visit.duration_minutes || 0} menit)`,
        data: visit,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyVisits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = (req as any).user.id;
      const dateStr = req.query.date as string | undefined;

      const result = await VisitsService.getMyVisits(employeeId, dateStr);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateStr = req.query.date as string | undefined;

      const result = await VisitsService.getAdminVisitsOverview(dateStr);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        employee_id,
        client_name,
        client_address,
        contact_person,
        contact_phone,
        check_in_time,
        check_out_time,
        visit_purpose,
        notes,
        order_amount,
        status,
        latitude,
        longitude,
      } = req.body;

      const visit = await VisitsService.adminCreate(
        {
          employee_id,
          client_name,
          client_address,
          contact_person,
          contact_phone,
          check_in_time,
          check_out_time,
          visit_purpose,
          notes,
          order_amount: order_amount !== undefined && order_amount !== '' ? parseFloat(order_amount) : 0,
          status,
          latitude: latitude !== undefined && latitude !== '' ? parseFloat(latitude) : undefined,
          longitude: longitude !== undefined && longitude !== '' ? parseFloat(longitude) : undefined,
        },
        req.file
      );

      res.status(201).json({
        success: true,
        message: `Kunjungan di ${visit.client_name} berhasil dicatat oleh Admin`,
        data: visit,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await VisitsService.adminDelete(String(id));
      res.status(200).json({
        success: true,
        message: 'Data kunjungan berhasil dihapus',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
