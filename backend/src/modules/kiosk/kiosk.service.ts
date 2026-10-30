import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middlewares/errorHandler';
import { StorageService } from '../../services/storage.service';
import { calculateAttendanceStatus, getNormalizedDate } from '../../utils/attendanceCalculator';

export class KioskService {
  /**
   * Get Kiosk Initialization Data (Offices, Active Staff Directory with Today's status, and Server Time)
   */
  static async getKioskInitData(officeId?: string) {
    const offices = await prisma.office.findMany({
      orderBy: { name: 'asc' },
    });

    const selectedOffice = officeId
      ? offices.find((o) => o.id === officeId) || offices[0]
      : offices[0];

    const serverNow = new Date();
    const todayDate = getNormalizedDate(serverNow);

    const employees = await prisma.employee.findMany({
      where: { is_active: true },
      orderBy: [
        { full_name: 'asc' },
        { department: 'asc' },
      ],
      include: {
        shift: true,
        office: true,
        attendance_records: {
          where: { date: todayDate },
          take: 1,
        },
      },
    });

    const staffList = employees.map((emp) => {
      const todayRecord = emp.attendance_records[0];
      let todayStatus: 'NOT_CLOCKED_IN' | 'CLOCKED_IN' | 'CLOCKED_OUT' = 'NOT_CLOCKED_IN';
      if (todayRecord) {
        if (todayRecord.clock_out_time) {
          todayStatus = 'CLOCKED_OUT';
        } else if (todayRecord.clock_in_time) {
          todayStatus = 'CLOCKED_IN';
        }
      }

      return {
        id: emp.id,
        employee_id_number: emp.employee_id_number || 'PGE-STAFF',
        full_name: emp.full_name,
        nickname: emp.nickname || emp.full_name.split(' ')[0],
        department: emp.department,
        position: emp.position,
        shift: {
          id: emp.shift?.id || null,
          name: emp.shift?.name || 'Standard Working Hours',
          start_time: emp.shift?.start_time || '08:00',
          end_time: emp.shift?.end_time || '17:00',
        },
        office_name: emp.office?.name || selectedOffice?.name || 'Kantor Pusat Solo',
        today_status: todayStatus,
        clock_in_time: todayRecord?.clock_in_time ? todayRecord.clock_in_time.toISOString() : null,
        clock_out_time: todayRecord?.clock_out_time ? todayRecord.clock_out_time.toISOString() : null,
        late_minutes: todayRecord?.late_minutes || 0,
        status_label: todayRecord?.status || null,
        has_pin: !!emp.kiosk_pin,
      };
    });

    return {
      server_time: serverNow.toISOString(),
      offices,
      selected_office: selectedOffice,
      employees: staffList,
    };
  }

  /**
   * Kiosk Check-In with Selfie & PIN verification
   */
  static async checkInKiosk(
    employeeId: string,
    pin?: string,
    file?: Express.Multer.File,
    officeId?: string,
    clientTimestamp?: string
  ) {
    if (!file) {
      throw ApiError.badRequest('Foto selfie kamera tablet/kios wajib diambil untuk verifikasi.');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true, office: true },
    });

    if (!employee || !employee.is_active) {
      throw ApiError.notFound('Data karyawan tidak ditemukan atau sudah tidak aktif.');
    }

    // Optional PIN verification if provided
    if (pin && employee.kiosk_pin && pin.trim() !== employee.kiosk_pin) {
      throw ApiError.badRequest('PIN Kios yang Anda masukkan salah.');
    }

    const serverNow = new Date();
    const todayDate = getNormalizedDate(serverNow);

    // Check if already clocked in today
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        employee_id: employeeId,
        date: todayDate,
      },
    });

    if (existing && existing.clock_in_time) {
      const timeStr = existing.clock_in_time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      throw ApiError.badRequest(`Karyawan sudah melakukan presensi masuk hari ini pada pukul ${timeStr} WIB.`);
    }

    // Determine shift & lat/lng
    const office = officeId
      ? await prisma.office.findUnique({ where: { id: officeId } })
      : employee.office;
    const lat = office?.latitude || -7.55611;
    const lng = office?.longitude || 110.83167;

    const shiftStartTime = employee.shift?.start_time || '08:00';
    const gracePeriod = employee.shift?.grace_period_minutes ?? 15;
    const { status, lateMinutes } = calculateAttendanceStatus(
      serverNow,
      shiftStartTime,
      gracePeriod,
      false
    );

    // Upload selfie photo
    const photoUrl = await StorageService.uploadSelfie({
      employeeId,
      type: 'clockin',
      buffer: file.buffer,
      mimeType: file.mimetype,
      timestamp: serverNow,
    });

    const record = await prisma.attendanceRecord.create({
      data: {
        employee_id: employeeId,
        date: todayDate,
        clock_in_time: serverNow,
        clock_in_lat: lat,
        clock_in_lng: lng,
        clock_in_photo_url: photoUrl,
        status,
        late_minutes: lateMinutes,
      },
    });

    const timeStr = serverNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const greetingName = employee.nickname || employee.full_name;
    const statusText = status === 'LATE' ? `Terlambat ${lateMinutes} menit` : 'Tepat Waktu';

    return {
      record_id: record.id,
      employee_name: employee.full_name,
      nickname: greetingName,
      department: employee.department,
      clock_in_time: timeStr,
      status,
      status_text: statusText,
      photo_url: photoUrl,
      message: `Presensi Masuk Berhasil! Halo ${greetingName}, Anda tercatat pada ${timeStr} WIB (${statusText}). Selamat bertugas!`,
    };
  }

  /**
   * Kiosk Check-Out with Selfie & PIN verification
   */
  static async checkOutKiosk(
    employeeId: string,
    pin?: string,
    file?: Express.Multer.File,
    officeId?: string,
    clientTimestamp?: string
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true, office: true },
    });

    if (!employee || !employee.is_active) {
      throw ApiError.notFound('Data karyawan tidak ditemukan.');
    }

    // Optional PIN verification if provided
    if (pin && employee.kiosk_pin && pin.trim() !== employee.kiosk_pin) {
      throw ApiError.badRequest('PIN Kios yang Anda masukkan salah.');
    }

    const serverNow = new Date();
    const todayDate = getNormalizedDate(serverNow);

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        employee_id: employeeId,
        date: todayDate,
      },
    });

    if (!existing || !existing.clock_in_time) {
      throw ApiError.badRequest('Belum ada catatan presensi masuk untuk hari ini. Silakan presensi masuk terlebih dahulu.');
    }

    if (existing.clock_out_time) {
      const timeStr = existing.clock_out_time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      throw ApiError.badRequest(`Karyawan sudah melakukan presensi pulang hari ini pada pukul ${timeStr} WIB.`);
    }

    let photoUrl: string | null = null;
    if (file) {
      photoUrl = await StorageService.uploadSelfie({
        employeeId,
        type: 'clockout',
        buffer: file.buffer,
        mimeType: file.mimetype,
        timestamp: serverNow,
      });
    }

    const record = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        clock_out_time: serverNow,
        clock_out_photo_url: photoUrl,
      },
    });

    const timeStr = serverNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const greetingName = employee.nickname || employee.full_name;

    return {
      record_id: record.id,
      employee_name: employee.full_name,
      nickname: greetingName,
      department: employee.department,
      clock_out_time: timeStr,
      photo_url: photoUrl,
      message: `Presensi Pulang Berhasil! Terima kasih atas dedikasi dan kerja keras Anda hari ini, ${greetingName}. Selamat beristirahat!`,
    };
  }

  /**
   * Verify Admin PIN to exit Kiosk Mode or change Kiosk Settings
   */
  static verifyAdminPin(pin: string) {
    const validPins = ['8888', '1234', '9999', 'admin123'];
    if (pin && validPins.includes(pin.trim())) {
      return { success: true, authorized: true, message: 'Otorisasi HR Kios Berhasil' };
    }
    throw ApiError.unauthorized('PIN Supervisor/Admin Kios tidak valid.');
  }

  /**
   * Update Employee Kiosk PIN
   */
  static async updateEmployeePin(employeeId: string, oldPin: string, newPin: string) {
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      throw ApiError.badRequest('PIN baru harus terdiri dari 4 hingga 6 digit angka.');
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw ApiError.notFound('Karyawan tidak ditemukan.');

    if (employee.kiosk_pin && employee.kiosk_pin !== oldPin) {
      throw ApiError.badRequest('PIN lama salah.');
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: { kiosk_pin: newPin },
    });

    return { success: true, message: 'PIN Kios berhasil diperbarui.' };
  }
}
