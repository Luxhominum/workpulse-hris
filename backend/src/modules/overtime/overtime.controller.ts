import { Request, Response, NextFunction } from 'express';
import { OvertimeService } from './overtime.service';
import { CreateOvertimeSchema, ApproveOvertimeSchema, RejectOvertimeSchema } from './overtime.schema';
import { OvertimeStatus } from '@prisma/client';
import { AuditService, extractAuditContext } from '../audit/audit.service';

export class OvertimeController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateOvertimeSchema.parse(req.body);
      const result = await OvertimeService.createOvertime(req.user!.id, validated);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMyOvertimes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OvertimeService.getMyOvertimes(req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as OvertimeStatus | undefined;
      const department = req.query.department as string | undefined;
      const data = await OvertimeService.getAllOvertimes(status, department);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const validated = ApproveOvertimeSchema.parse(req.body);
      const result = await OvertimeService.approveOvertime(id, req.user!.id, validated.approval_note);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'OVERTIME_APPROVE',
        entity_type: 'OVERTIME_REQUEST',
        entity_id: id,
        description: `Menyetujui pengajuan lembur SPL karyawan. Catatan: ${validated.approval_note || 'Disetujui'}`,
        new_values: result,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const validated = RejectOvertimeSchema.parse(req.body);
      const result = await OvertimeService.rejectOvertime(id, req.user!.id, validated.approval_note);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'OVERTIME_REJECT',
        entity_type: 'OVERTIME_REQUEST',
        entity_id: id,
        description: `Menolak pengajuan lembur SPL karyawan. Alasan: ${validated.approval_note || 'Ditolak'}`,
        new_values: result,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await OvertimeService.cancelOvertime(id, req.user!.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
