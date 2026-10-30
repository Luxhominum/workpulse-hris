import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middlewares/errorHandler';
import { CreateOvertimeInput } from './overtime.schema';
import { OvertimeStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

export class OvertimeService {
  /**
   * Helper to calculate duration in hours between two HH:mm strings
   */
  static calculateDuration(start: string, end: string): number {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    // Handle overnight overtime (e.g. 22:00 to 02:00)
    if (endTotal <= startTotal) {
      endTotal += 24 * 60;
    }

    const diffMinutes = endTotal - startTotal;
    return Math.round((diffMinutes / 60) * 10) / 10;
  }

  /**
   * Create Overtime Request (SPL) by Employee
   */
  static async createOvertime(employeeId: string, input: CreateOvertimeInput) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });

    if (!employee || !employee.is_active) {
      throw ApiError.notFound('Data karyawan tidak ditemukan atau sudah tidak aktif.');
    }

    const duration = this.calculateDuration(input.start_time, input.end_time);
    if (duration < 0.5) {
      throw ApiError.badRequest('Durasi lembur minimal 30 menit (0.5 jam).');
    }
    if (duration > 12) {
      throw ApiError.badRequest('Durasi lembur maksimal 12 jam per pengajuan.');
    }

    const targetDate = new Date(`${input.date}T00:00:00.000Z`);

    // Check existing pending request on same date
    const existing = await prisma.overtimeRequest.findFirst({
      where: {
        employee_id: employeeId,
        date: targetDate,
        status: { in: [OvertimeStatus.PENDING, OvertimeStatus.APPROVED] },
      },
    });

    if (existing) {
      throw ApiError.badRequest(
        `Sudah ada pengajuan lembur dengan status ${existing.status} pada tanggal ${input.date}.`
      );
    }

    const overtime = await prisma.overtimeRequest.create({
      data: {
        employee_id: employeeId,
        date: targetDate,
        start_time: input.start_time,
        end_time: input.end_time,
        duration_hours: duration,
        reason: input.reason,
        status: OvertimeStatus.PENDING,
      },
    });

    return {
      success: true,
      data: overtime,
      message: `Surat Perintah Lembur (SPL) ${duration} jam berhasil diajukan dan menunggu persetujuan HRD/Manajer.`,
    };
  }

  /**
   * Get Employee's own Overtime Requests
   */
  static async getMyOvertimes(employeeId: string) {
    const overtimes = await prisma.overtimeRequest.findMany({
      where: { employee_id: employeeId },
      orderBy: { date: 'desc' },
    });

    return overtimes;
  }

  /**
   * Get All Overtime Requests for Admin/Manager
   */
  static async getAllOvertimes(status?: OvertimeStatus, department?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (department && department !== 'all') {
      where.employee = { department };
    }

    const overtimes = await prisma.overtimeRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            nickname: true,
            employee_id_number: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' },
      ],
    });

    return overtimes;
  }

  /**
   * Approve Overtime Request
   */
  static async approveOvertime(id: string, managerId: string, approvalNote?: string) {
    const request = await prisma.overtimeRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!request) {
      throw ApiError.notFound('Pengajuan lembur tidak ditemukan.');
    }

    if (request.status !== OvertimeStatus.PENDING) {
      throw ApiError.badRequest(`Pengajuan lembur sudah berstatus ${request.status}.`);
    }

    const updated = await prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: OvertimeStatus.APPROVED,
        approved_by: managerId,
        approval_note: approvalNote || 'Disetujui oleh Manajer',
        reviewed_at: new Date(),
      },
    });

    NotificationsService.create({
      employee_id: request.employee_id,
      type: 'OVERTIME_APPROVAL',
      title: 'Pengajuan Lembur Disetujui',
      message: `Pengajuan lembur SPL Anda untuk tanggal ${new Date(request.date).toLocaleDateString('id-ID')} (${request.duration_hours} jam) telah disetujui.`,
    });

    return {
      success: true,
      data: updated,
      message: `Pengajuan lembur untuk ${request.employee.full_name} (${request.duration_hours} jam) berhasil disetujui.`,
    };
  }

  /**
   * Reject Overtime Request
   */
  static async rejectOvertime(id: string, managerId: string, reason: string) {
    const request = await prisma.overtimeRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!request) {
      throw ApiError.notFound('Pengajuan lembur tidak ditemukan.');
    }

    if (request.status !== OvertimeStatus.PENDING) {
      throw ApiError.badRequest(`Pengajuan lembur sudah berstatus ${request.status}.`);
    }

    const updated = await prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: OvertimeStatus.REJECTED,
        approved_by: managerId,
        approval_note: reason,
        reviewed_at: new Date(),
      },
    });

    NotificationsService.create({
      employee_id: request.employee_id,
      type: 'OVERTIME_APPROVAL',
      title: 'Pengajuan Lembur Ditolak',
      message: `Pengajuan lembur SPL Anda ditolak. Alasan: ${reason}`,
    });

    return {
      success: true,
      data: updated,
      message: `Pengajuan lembur untuk ${request.employee.full_name} ditolak.`,
    };
  }

  /**
   * Delete / Cancel pending overtime
   */
  static async cancelOvertime(id: string, employeeId: string) {
    const request = await prisma.overtimeRequest.findUnique({ where: { id } });
    if (!request) throw ApiError.notFound('Pengajuan lembur tidak ditemukan.');
    if (request.employee_id !== employeeId) throw ApiError.forbidden('Tidak memiliki hak untuk membatalkan pengajuan ini.');
    if (request.status !== OvertimeStatus.PENDING) {
      throw ApiError.badRequest('Hanya pengajuan yang masih PENDING yang dapat dibatalkan.');
    }

    await prisma.overtimeRequest.delete({ where: { id } });
    return { success: true, message: 'Pengajuan lembur berhasil dibatalkan.' };
  }
}
