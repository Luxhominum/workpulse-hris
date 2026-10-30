import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middlewares/errorHandler';
import { CreateLeaveInput, AdminCreateLeaveInput } from './leaves.schema';
import { LeaveStatus, LeaveType } from '@prisma/client';
import { StorageService } from '../../services/storage.service';
import { NotificationsService } from '../notifications/notifications.service';

export class LeavesService {
  /**
   * Helper to calculate working days (excluding Sat & Sun) between two dates inclusive
   */
  public static calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(count, 1);
  }

  static async create(
    employeeId: string,
    data: CreateLeaveInput,
    file?: Express.Multer.File
  ) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw ApiError.badRequest('Invalid start_date or end_date');
    }

    if (startDate > endDate) {
      throw ApiError.badRequest('start_date cannot be after end_date');
    }

    // Check employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw ApiError.notFound('Employee profile not found');
    }

    // Quota validation for ANNUAL leave
    if (data.type === LeaveType.ANNUAL) {
      const requestedDays = this.calculateWorkingDays(startDate, endDate);
      const remainingQuota = employee.annual_leave_quota - employee.annual_leave_used;

      if (requestedDays > remainingQuota) {
        throw ApiError.badRequest(
          `Insufficient annual leave balance. Requested ${requestedDays} days, but you only have ${remainingQuota} days remaining.`
        );
      }
    }

    // Process attachment file if provided
    let attachmentUrl = data.attachment_url || null;
    if (file) {
      attachmentUrl = await StorageService.uploadAttachment({
        employeeId,
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
    }

    return prisma.leaveRequest.create({
      data: {
        employee_id: employeeId,
        type: data.type,
        start_date: startDate,
        end_date: endDate,
        reason: data.reason.trim(),
        attachment_url: attachmentUrl,
        status: LeaveStatus.PENDING,
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            email: true,
            department: true,
            position: true,
            annual_leave_quota: true,
            annual_leave_used: true,
          },
        },
      },
    });
  }

  static async adminCreate(
    adminUserId: string,
    data: AdminCreateLeaveInput,
    file?: Express.Multer.File
  ) {
    const startDate = new Date(data.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(data.end_date);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw ApiError.badRequest('Format tanggal mulai atau selesai tidak valid');
    }

    if (startDate > endDate) {
      throw ApiError.badRequest('Tanggal mulai tidak boleh melewati tanggal selesai');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: data.employee_id },
    });

    if (!employee) {
      throw ApiError.notFound('Profil karyawan tidak ditemukan');
    }

    // Clean up any empty manual attendance records on these dates
    await prisma.attendanceRecord.deleteMany({
      where: {
        employee_id: data.employee_id,
        date: { gte: startDate, lte: endDate },
        clock_in_time: null,
      },
    });

    const workingDays = this.calculateWorkingDays(startDate, endDate);

    // If Annual Leave, deduct quota from employee
    if (data.type === LeaveType.ANNUAL) {
      await prisma.employee.update({
        where: { id: data.employee_id },
        data: {
          annual_leave_used: {
            increment: workingDays,
          },
        },
      });
    }

    let attachmentUrl = data.attachment_url || null;
    if (file) {
      attachmentUrl = await StorageService.uploadAttachment({
        employeeId: data.employee_id,
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
    }

    return prisma.leaveRequest.create({
      data: {
        employee_id: data.employee_id,
        type: data.type,
        start_date: startDate,
        end_date: endDate,
        reason: data.reason.trim(),
        attachment_url: attachmentUrl,
        status: LeaveStatus.APPROVED,
        approved_by_id: adminUserId,
        approved_at: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            email: true,
            department: true,
            position: true,
            annual_leave_quota: true,
            annual_leave_used: true,
          },
        },
      },
    });
  }

  static async getBalance(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        annual_leave_quota: true,
        annual_leave_used: true,
      },
    });

    if (!employee) {
      throw ApiError.notFound('Employee not found');
    }

    return {
      annual_leave_quota: employee.annual_leave_quota,
      annual_leave_used: employee.annual_leave_used,
      annual_leave_remaining: Math.max(0, employee.annual_leave_quota - employee.annual_leave_used),
    };
  }

  static async getPending() {
    return prisma.leaveRequest.findMany({
      where: { status: LeaveStatus.PENDING },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            email: true,
            department: true,
            position: true,
            phone: true,
            shift: true,
            annual_leave_quota: true,
            annual_leave_used: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async getAll(status?: LeaveStatus) {
    return prisma.leaveRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            email: true,
            department: true,
            position: true,
            phone: true,
            shift: true,
            annual_leave_quota: true,
            annual_leave_used: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async getMyLeaves(employeeId: string) {
    return prisma.leaveRequest.findMany({
      where: { employee_id: employeeId },
      orderBy: { created_at: 'desc' },
    });
  }

  static async approve(leaveId: string, reviewerId: string) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true },
    });

    if (!request) {
      throw ApiError.notFound('Leave or correction request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw ApiError.badRequest(`Request is already ${request.status}`);
    }

    // If ANNUAL leave is approved, deduct from annual_leave_used
    if (request.type === LeaveType.ANNUAL) {
      const days = this.calculateWorkingDays(request.start_date, request.end_date);
      await prisma.employee.update({
        where: { id: request.employee_id },
        data: {
          annual_leave_used: {
            increment: days,
          },
        },
      });
    }

    const result = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.APPROVED,
        approved_by_id: reviewerId,
        approved_at: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            email: true,
            department: true,
            position: true,
            annual_leave_quota: true,
            annual_leave_used: true,
          },
        },
      },
    });

    // Auto-dispatch notification to the employee
    NotificationsService.create({
      employee_id: request.employee_id,
      type: 'LEAVE_APPROVAL',
      title: 'Permohonan Cuti Disetujui',
      message: `Permohonan ${request.type} Anda untuk tanggal ${new Date(request.start_date).toLocaleDateString('id-ID')} telah disetujui oleh HRD.`,
    });

    return result;
  }

  static async reject(leaveId: string, reviewerId: string, rejectionReason?: string) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
    });

    if (!request) {
      throw ApiError.notFound('Leave or correction request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw ApiError.badRequest(`Request is already ${request.status}`);
    }

    const result = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.REJECTED,
        approved_by_id: reviewerId,
        approved_at: new Date(),
        rejection_reason: rejectionReason || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            email: true,
            department: true,
            position: true,
          },
        },
      },
    });

    // Auto-dispatch notification to the employee
    NotificationsService.create({
      employee_id: request.employee_id,
      type: 'LEAVE_APPROVAL',
      title: 'Permohonan Cuti Ditolak',
      message: `Permohonan ${request.type} Anda ditolak. Alasan: ${rejectionReason || 'Tidak disetujui'}`,
    });

    return result;
  }
}
