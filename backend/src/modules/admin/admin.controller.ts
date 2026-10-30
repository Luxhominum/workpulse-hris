import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { AuditService, extractAuditContext } from '../audit/audit.service';

export class AdminController {
  static async getLiveOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const data = await AdminService.getLiveOverview(date);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPayrollSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;

      const data = await AdminService.getPayrollSummary(year, month);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
      const format = req.query.format === 'csv' ? 'csv' : 'xlsx';

      const file = await AdminService.exportPayrollFile(year, month, format);

      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'PAYROLL_EXPORT',
        entity_type: 'PAYROLL',
        description: `Mengekspor rekapitulasi data penggajian periode ${month}/${year} dalam format ${format.toUpperCase()}`,
        new_values: { year, month, format, filename: file.filename },
      });

      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.status(200).send(file.buffer);
    } catch (error) {
      next(error);
    }
  }

  static async adjustAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await AdminService.adjustAttendance(req.user!.id, req.body);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'ATTENDANCE_MANUAL_ADJUST',
        entity_type: 'ATTENDANCE',
        entity_id: record?.id,
        description: `Koreksi manual presensi karyawan (${req.body.employee_id}) tanggal ${req.body.date}. Alasan: ${req.body.reason}`,
        new_values: req.body,
      });

      res.status(200).json({
        success: true,
        message: 'Attendance record manually adjusted successfully',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMonthlyAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getUTCFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getUTCMonth() + 1;
      const department = req.query.department as string | undefined;

      const analytics = await AdminService.getMonthlyAnalytics(year, month, department);
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAttendanceMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
      const department = req.query.department as string | undefined;

      const matrix = await AdminService.getAttendanceMatrixData(year, month, department);
      res.status(200).json({
        success: true,
        data: matrix,
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportAttendanceMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
      const department = req.query.department as string | undefined;

      const file = await AdminService.exportAttendanceMatrixFile(year, month, department);

      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.status(200).send(file.buffer);
    } catch (error) {
      next(error);
    }
  }
}
