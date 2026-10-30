import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middlewares/errorHandler';
import { StorageService } from '../../services/storage.service';

export interface CheckInVisitDto {
  client_name: string;
  client_address?: string;
  contact_person?: string;
  contact_phone?: string;
  latitude: number;
  longitude: number;
  visit_purpose: string;
}

export interface CheckOutVisitDto {
  notes?: string;
  order_amount?: number;
}

export interface AdminCreateVisitDto {
  employee_id: string;
  client_name: string;
  client_address?: string;
  contact_person?: string;
  contact_phone?: string;
  check_in_time?: string;
  check_out_time?: string;
  visit_purpose?: string;
  notes?: string;
  order_amount?: number;
  status?: string;
  latitude?: number;
  longitude?: number;
}

export class VisitsService {
  /**
   * Sales Canvasing: Check-In at Client / Store with GPS and live photo
   */
  static async checkIn(employeeId: string, data: CheckInVisitDto, photoFile?: Express.Multer.File) {
    if ((data as any).is_mock_location) {
      throw ApiError.forbidden(
        'Check-in kunjungan toko ditolak! Terdeteksi penggunaan Fake GPS / Mock Location pada perangkat Anda.'
      );
    }

    if (!data.client_name || !data.client_name.trim()) {
      throw ApiError.badRequest('Nama toko / klien wajib diisi.');
    }

    if (!photoFile) {
      throw ApiError.badRequest('Foto selfie bukti kunjungan toko wajib diambil.');
    }

    if (data.latitude === undefined || data.longitude === undefined) {
      throw ApiError.badRequest('Titik koordinat GPS wajib terdeteksi.');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, company_id: true },
    });

    if (!employee) {
      throw ApiError.notFound('Karyawan tidak ditemukan.');
    }

    const photoUrl = await StorageService.uploadVisitPhoto({
      employeeId,
      buffer: photoFile.buffer,
      mimeType: photoFile.mimetype,
    });

    const visit = await prisma.clientVisit.create({
      data: {
        company_id: employee.company_id,
        employee_id: employeeId,
        client_name: data.client_name.trim(),
        client_address: data.client_address?.trim() || null,
        contact_person: data.contact_person?.trim() || null,
        contact_phone: data.contact_phone?.trim() || null,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        photo_url: photoUrl,
        visit_purpose: data.visit_purpose || 'Kunjungan Rutin',
        status: 'IN_PROGRESS',
      },
    });

    return visit;
  }

  /**
   * Sales Canvasing: Check-Out from Client / Store with notes & closing order amount
   */
  static async checkOut(visitId: string, employeeId: string, data: CheckOutVisitDto) {
    const visit = await prisma.clientVisit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      throw ApiError.notFound('Data kunjungan tidak ditemukan.');
    }

    if (visit.employee_id !== employeeId) {
      throw ApiError.forbidden('Anda tidak berhak mengubah kunjungan ini.');
    }

    const now = new Date();
    const durationMs = now.getTime() - new Date(visit.check_in_time).getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

    const updated = await prisma.clientVisit.update({
      where: { id: visitId },
      data: {
        check_out_time: now,
        duration_minutes: durationMinutes,
        notes: data.notes?.trim() || visit.notes,
        order_amount: data.order_amount !== undefined ? Number(data.order_amount) : visit.order_amount,
        status: 'COMPLETED',
      },
    });

    return updated;
  }

  /**
   * Get employee's personal visit history for a specific date (defaults to today)
   */
  static async getMyVisits(employeeId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const visits = await prisma.clientVisit.findMany({
      where: {
        employee_id: employeeId,
        check_in_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { check_in_time: 'desc' },
    });

    const totalClosing = visits.reduce((acc, v) => acc + (v.order_amount || 0), 0);

    return {
      date: startOfDay.toISOString().slice(0, 10),
      total_visits: visits.length,
      total_closing: totalClosing,
      visits,
    };
  }

  /**
   * Admin / Manager: Get all visits across all sales reps for monitoring
   */
  static async getAdminVisitsOverview(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const visits = await prisma.clientVisit.findMany({
      where: {
        check_in_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            nickname: true,
            department: true,
            position: true,
            employee_id_number: true,
          },
        },
      },
      orderBy: { check_in_time: 'desc' },
    });

    const totalClosing = visits.reduce((acc, v) => acc + (v.order_amount || 0), 0);
    const completedCount = visits.filter((v) => v.status === 'COMPLETED').length;
    const inProgressCount = visits.filter((v) => v.status === 'IN_PROGRESS').length;

    return {
      date: startOfDay.toISOString().slice(0, 10),
      metrics: {
        total_visits: visits.length,
        completed_visits: completedCount,
        in_progress_visits: inProgressCount,
        total_closing_amount: totalClosing,
      },
      visits,
    };
  }

  /**
   * Admin / Manager Manual Create Visit (Bypass)
   */
  static async adminCreate(data: AdminCreateVisitDto, photoFile?: Express.Multer.File) {
    if (!data.employee_id) {
      throw ApiError.badRequest('Karyawan sales wajib dipilih.');
    }
    if (!data.client_name || !data.client_name.trim()) {
      throw ApiError.badRequest('Nama toko / klien wajib diisi.');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: data.employee_id },
      select: { id: true, company_id: true, full_name: true },
    });

    if (!employee) {
      throw ApiError.notFound('Karyawan sales tidak ditemukan.');
    }

    let photoUrl = '/uploads/visits/danar_hadi.svg';
    if (photoFile) {
      photoUrl = await StorageService.uploadVisitPhoto({
        employeeId: data.employee_id,
        buffer: photoFile.buffer,
        mimeType: photoFile.mimetype,
      });
    }

    const checkIn = data.check_in_time ? new Date(data.check_in_time) : new Date();
    const checkOut = data.check_out_time ? new Date(data.check_out_time) : null;
    let durationMinutes: number | null = null;

    if (checkIn && checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime();
      durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    }

    const visit = await prisma.clientVisit.create({
      data: {
        company_id: employee.company_id,
        employee_id: data.employee_id,
        client_name: data.client_name.trim(),
        client_address: data.client_address?.trim() || null,
        contact_person: data.contact_person?.trim() || null,
        contact_phone: data.contact_phone?.trim() || null,
        check_in_time: checkIn,
        check_out_time: checkOut,
        duration_minutes: durationMinutes,
        latitude: data.latitude !== undefined && !isNaN(Number(data.latitude)) ? Number(data.latitude) : -7.5612,
        longitude: data.longitude !== undefined && !isNaN(Number(data.longitude)) ? Number(data.longitude) : 110.8245,
        photo_url: photoUrl,
        visit_purpose: data.visit_purpose || 'Kunjungan Rutin',
        notes: data.notes?.trim() || null,
        order_amount: data.order_amount !== undefined ? Number(data.order_amount) : 0,
        status: data.status || (checkOut ? 'COMPLETED' : 'IN_PROGRESS'),
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            nickname: true,
            department: true,
            position: true,
            employee_id_number: true,
          },
        },
      },
    });

    return visit;
  }

  /**
   * Admin delete visit
   */
  static async adminDelete(visitId: string) {
    const existing = await prisma.clientVisit.findUnique({ where: { id: visitId } });
    if (!existing) {
      throw ApiError.notFound('Data kunjungan tidak ditemukan.');
    }
    await prisma.clientVisit.delete({ where: { id: visitId } });
    return { success: true };
  }
}
