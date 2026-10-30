import { Request, Response, NextFunction } from 'express';
import { LeavesService } from './leaves.service';
import { createLeaveSchema, adminCreateLeaveSchema, reviewLeaveSchema } from './leaves.schema';
import { LeaveStatus } from '@prisma/client';
import { AuditService, extractAuditContext } from '../audit/audit.service';

function getId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class LeavesController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createLeaveSchema.parse(req.body);
      const leave = await LeavesService.create(req.user!.id, data, req.file);
      res.status(201).json({
        success: true,
        message: 'Leave / permit request submitted successfully',
        data: leave,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = adminCreateLeaveSchema.parse(req.body);
      const leave = await LeavesService.adminCreate(req.user!.id, data, req.file);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'LEAVE_ADMIN_CREATE',
        entity_type: 'LEAVE_REQUEST',
        entity_id: leave.id,
        description: `Menerbitkan cuti/izin langsung (Admin Bypass) tipe ${leave.type} untuk karyawan (${leave.employee_id})`,
        new_values: leave,
      });

      res.status(201).json({
        success: true,
        message: 'Permohonan izin / cuti berhasil diterbitkan dan langsung disetujui (Admin Bypass)',
        data: leave,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const balance = await LeavesService.getBalance(req.user!.id);
      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPending(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaves = await LeavesService.getPending();
      res.status(200).json({
        success: true,
        data: leaves,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as LeaveStatus | undefined;
      const leaves = await LeavesService.getAll(status);
      res.status(200).json({
        success: true,
        data: leaves,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyLeaves(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaves = await LeavesService.getMyLeaves(req.user!.id);
      res.status(200).json({
        success: true,
        data: leaves,
      });
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await LeavesService.approve(getId(req), req.user!.id);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'LEAVE_APPROVE',
        entity_type: 'LEAVE_REQUEST',
        entity_id: updated.id,
        description: `Menyetujui pengajuan cuti/izin ${updated.type} karyawan (${updated.employee?.full_name || updated.employee_id})`,
        new_values: updated,
      });

      res.status(200).json({
        success: true,
        message: 'Request approved successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rejection_reason } = reviewLeaveSchema.parse(req.body);
      const updated = await LeavesService.reject(getId(req), req.user!.id, rejection_reason);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'LEAVE_REJECT',
        entity_type: 'LEAVE_REQUEST',
        entity_id: updated.id,
        description: `Menolak pengajuan cuti/izin ${updated.type} karyawan (${updated.employee?.full_name || updated.employee_id}). Alasan: ${rejection_reason}`,
        new_values: { ...updated, rejection_reason },
      });

      res.status(200).json({
        success: true,
        message: 'Request rejected',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
