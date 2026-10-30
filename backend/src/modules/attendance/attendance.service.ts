import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middlewares/errorHandler';
import { calculateDistance } from '../../utils/geo';
import { calculateAttendanceStatus, getNormalizedDate } from '../../utils/attendanceCalculator';
import { StorageService } from '../../services/storage.service';
import { ClockInInput, ClockOutInput } from './attendance.schema';
import { AdminService } from '../admin/admin.service';
import { AuditService } from '../audit/audit.service';

export class AttendanceService {
  /**
   * Clock in an employee with GPS validation, server time calculation, and selfie upload.
   */
  static async clockIn(
    employeeId: string,
    data: ClockInInput,
    file?: Express.Multer.File
  ) {
    if (!file) {
      throw ApiError.badRequest('Selfie photo is required for clock-in');
    }

    // 1. Time evaluation (supports offline client timestamp within 24h)
    const serverNow = new Date();
    let effectiveNow = serverNow;
    if (data.client_timestamp) {
      const parsedClientTime = new Date(data.client_timestamp);
      if (!isNaN(parsedClientTime.getTime()) && parsedClientTime.getTime() <= serverNow.getTime() + 60000) {
        effectiveNow = parsedClientTime;
      }
    }
    const todayDate = getNormalizedDate(effectiveNow);

    // 2. Load employee along with assigned office and shift
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        office: true,
        shift: true,
      },
    });

    if (!employee) {
      throw ApiError.notFound('Data karyawan tidak ditemukan.');
    }

    let matchedOffice = employee.office;
    if (!matchedOffice) {
      matchedOffice = await prisma.office.findFirst();
      if (matchedOffice) {
        await prisma.employee.update({
          where: { id: employeeId },
          data: { office_id: matchedOffice.id },
        }).catch(() => {});
      }
    }

    if (!matchedOffice) {
      throw ApiError.badRequest('Belum ada lokasi kantor cabang yang dikonfigurasi di sistem.');
    }

    let matchedShift = employee.shift;
    if (!matchedShift) {
      matchedShift = await prisma.shift.findFirst();
      if (matchedShift) {
        await prisma.employee.update({
          where: { id: employeeId },
          data: { shift_id: matchedShift.id },
        }).catch(() => {});
      }
    }

    if (!matchedShift) {
      throw ApiError.badRequest('Belum ada jadwal shift yang dikonfigurasi di sistem.');
    }

    // 0. Anti-Spoofing & Mock Location Guard
    if (data.is_mock_location) {
      AuditService.record(
        {
          actor_id: employee.id,
          actor_name: employee.full_name,
          actor_email: employee.email,
          actor_role: employee.role,
        },
        {
          action: 'SECURITY_MOCK_LOCATION_BLOCKED',
          entity_type: 'ATTENDANCE',
          description: `Presensi DITOLAK: Terdeteksi Fake GPS / Mock Location pada perangkat karyawan ${employee.full_name}`,
          new_values: { latitude: data.latitude, longitude: data.longitude, mock_details: data.mock_details },
        }
      );

      throw ApiError.forbidden(
        'Presensi ditolak! Terdeteksi penggunaan aplikasi Fake GPS / Mock Location pada perangkat Anda. Silakan nonaktifkan Fake GPS untuk melanjutkan.'
      );
    }

    // 3. Single-active-session constraint: check if already clocked in today
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        employee_id_date: {
          employee_id: employeeId,
          date: todayDate,
        },
      },
    });

    if (existingRecord) {
      if (data.idempotency_key) {
        return {
          id: existingRecord.id,
          date: existingRecord.date.toISOString(),
          clock_in_time: existingRecord.clock_in_time?.toISOString() || null,
          status: existingRecord.status,
          late_minutes: existingRecord.late_minutes,
          clock_in_photo_url: existingRecord.clock_in_photo_url,
          distance_to_office_meters: 0,
          is_within_perimeter: true,
          office_name: matchedOffice.name,
          is_idempotent: true,
        };
      }
      throw ApiError.badRequest(
        `You have already clocked in for today at ${existingRecord.clock_in_time?.toISOString() || ''}`
      );
    }

    // 4. Multi-Branch Geofence Calculation (Haversine Formula)
    const assignedDistance = calculateDistance(
      data.latitude,
      data.longitude,
      matchedOffice.latitude,
      matchedOffice.longitude
    );

    let distanceMeters = assignedDistance;
    let isWithinAnyBranch = assignedDistance <= matchedOffice.radius_meters;

    // If outside assigned branch, check if employee is present at another regional branch (Tugas Luar / Cross-Branch)
    if (!isWithinAnyBranch) {
      const allOffices = await prisma.office.findMany();
      for (const branch of allOffices) {
        if (branch.id === matchedOffice.id) continue;
        const d = calculateDistance(data.latitude, data.longitude, branch.latitude, branch.longitude);
        if (d <= branch.radius_meters) {
          matchedOffice = branch;
          distanceMeters = d;
          isWithinAnyBranch = true;
          break;
        }
      }
    }

    const isOutsideOffice = !isWithinAnyBranch;

    // Reject if outside perimeter of all company branches and WFH is not authorized
    if (isOutsideOffice && !employee.is_wfh_allowed) {
      throw ApiError.badRequest(
        `Anda berada di luar radius kantor (${distanceMeters}m dari ${matchedOffice.name}, radius diizinkan: ${matchedOffice.radius_meters}m). Aktifkan WFH atau lakukan absensi di lokasi kantor.`
      );
    }

    // 5. Shift & Late Calculation Engine (Dynamic Roster or Default Shift)
    const rosterToday = await prisma.shiftRoster.findUnique({
      where: {
        employee_id_date: {
          employee_id: employeeId,
          date: todayDate,
        },
      },
      include: { shift: true },
    });
    const effectiveShift = rosterToday?.shift || matchedShift;

    const isWfhCheckIn = isOutsideOffice && employee.is_wfh_allowed;
    const { status, lateMinutes } = calculateAttendanceStatus(
      effectiveNow,
      effectiveShift.start_time,
      effectiveShift.grace_period_minutes,
      isWfhCheckIn
    );

    // 6. Photo Upload to Storage (S3 / R2 / Local Disk fallback)
    const photoUrl = await StorageService.uploadSelfie({
      employeeId,
      type: 'clockin',
      buffer: file.buffer,
      mimeType: file.mimetype,
      timestamp: effectiveNow,
    });

    // 7. Persist Attendance Record
    const record = await prisma.attendanceRecord.create({
      data: {
        employee_id: employeeId,
        date: todayDate,
        clock_in_time: effectiveNow,
        clock_in_lat: data.latitude,
        clock_in_lng: data.longitude,
        clock_in_photo_url: photoUrl,
        status,
        late_minutes: lateMinutes,
      },
    });

    return {
      id: record.id,
      date: record.date.toISOString(),
      clock_in_time: record.clock_in_time?.toISOString() || null,
      status: record.status,
      late_minutes: record.late_minutes,
      clock_in_photo_url: record.clock_in_photo_url,
      distance_to_office_meters: distanceMeters,
      is_within_perimeter: !isOutsideOffice,
      office_name: matchedOffice.name,
    };
  }

  /**
   * Clock out an employee for today
   */
  static async clockOut(
    employeeId: string,
    data: ClockOutInput,
    file?: Express.Multer.File
  ) {
    if (data.is_mock_location) {
      throw ApiError.forbidden(
        'Absen pulang ditolak! Terdeteksi penggunaan aplikasi Fake GPS / Mock Location pada perangkat Anda. Silakan nonaktifkan Fake GPS untuk melanjutkan.'
      );
    }

    // Time evaluation (supports offline client timestamp within 24h)
    const serverNow = new Date();
    let effectiveNow = serverNow;
    if (data.client_timestamp) {
      const parsedClientTime = new Date(data.client_timestamp);
      if (!isNaN(parsedClientTime.getTime()) && parsedClientTime.getTime() <= serverNow.getTime() + 60000) {
        effectiveNow = parsedClientTime;
      }
    }
    const todayDate = getNormalizedDate(effectiveNow);

    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        employee_id_date: {
          employee_id: employeeId,
          date: todayDate,
        },
      },
    });

    if (!existingRecord) {
      throw ApiError.badRequest('Cannot clock out: No clock-in record found for today');
    }

    if (existingRecord.clock_out_time) {
      if (data.idempotency_key) {
        return {
          id: existingRecord.id,
          clock_in_time: existingRecord.clock_in_time?.toISOString() || null,
          clock_out_time: existingRecord.clock_out_time.toISOString(),
          status: existingRecord.status,
          late_minutes: existingRecord.late_minutes,
          clock_out_photo_url: existingRecord.clock_out_photo_url,
          is_idempotent: true,
        };
      }
      throw ApiError.badRequest(
        `You have already clocked out for today at ${existingRecord.clock_out_time.toISOString()}`
      );
    }

    let clockOutPhotoUrl: string | null = null;
    if (file) {
      clockOutPhotoUrl = await StorageService.uploadSelfie({
        employeeId,
        type: 'clockout',
        buffer: file.buffer,
        mimeType: file.mimetype,
        timestamp: effectiveNow,
      });
    }

    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: {
        clock_out_time: effectiveNow,
        clock_out_photo_url: clockOutPhotoUrl,
      },
    });

    return {
      id: updatedRecord.id,
      clock_in_time: updatedRecord.clock_in_time?.toISOString() || null,
      clock_out_time: updatedRecord.clock_out_time?.toISOString(),
      status: updatedRecord.status,
      late_minutes: updatedRecord.late_minutes,
      clock_out_photo_url: updatedRecord.clock_out_photo_url,
    };
  }

  /**
   * Get today's attendance status for an employee
   */
  static async getTodayAttendance(employeeId: string) {
    const todayDate = getNormalizedDate(new Date());

    const record = await prisma.attendanceRecord.findUnique({
      where: {
        employee_id_date: {
          employee_id: employeeId,
          date: todayDate,
        },
      },
      include: {
        employee: {
          select: {
            full_name: true,
            email: true,
            shift: true,
            office: true,
          },
        },
      },
    });

    return record;
  }

  /**
   * Get recent personal attendance history, optionally filtered by month (YYYY-MM)
   */
  static async getMyHistory(employeeId: string, limit = 60, month?: string) {
    const where: any = { employee_id: employeeId };

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
      where.date = { gte: start, lte: end };
    }

    return prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  static async getMyPayslip(employeeId: string, year: number, month: number) {
    const { summary } = await AdminService.getPayrollSummary(year, month);
    const slip = summary.find((s) => s.employee_id === employeeId);
    if (!slip) {
      throw ApiError.notFound('Data payroll untuk periode ini belum tersedia.');
    }
    return slip;
  }
}
