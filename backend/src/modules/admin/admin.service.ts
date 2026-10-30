import { prisma } from '../../lib/prisma';
import { getNormalizedDate, calculateAttendanceStatus } from '../../utils/attendanceCalculator';
import { LeaveStatus, LeaveType, AttendanceStatus } from '@prisma/client';
import { ApiError } from '../../middlewares/errorHandler';
import * as XLSX from 'xlsx';
import { decryptPII } from '../../utils/crypto';

export interface AttendanceAuditRow {
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  position: string;
  role: string;
  office_name: string;
  shift_name: string;
  shift_hours: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: 'ON_TIME' | 'LATE' | 'WFH' | 'OUT_OF_OFFICE' | 'ABSENT' | 'ON_LEAVE' | 'HADIR_BUKAN_HARI_KERJA' | 'LIBUR';
  late_minutes: number;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  leave_reason?: string;
  is_manual_adjustment: boolean;
  adjustment_reason?: string | null;
  day_type: 'WORKDAY' | 'OFF_DAY';
  attendance_record_id?: string | null;
}

export class AdminService {
  /**
   * Daily Live Attendance Board Overview with metrics and photo/map audit data
   */
  static async getLiveOverview(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const queryDate = getNormalizedDate(targetDate);

    // Fetch active employees only
    const employees = await prisma.employee.findMany({
      where: { is_active: true },
      include: {
        office: true,
        shift: true,
      },
      orderBy: { full_name: 'asc' },
    });

    // Fetch attendances for this specific day
    const attendances = await prisma.attendanceRecord.findMany({
      where: { date: queryDate },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.employee_id, a]));

    // Fetch active approved leaves for this day
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const activeLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: LeaveStatus.APPROVED,
        start_date: { lte: endOfDay },
        end_date: { gte: startOfDay },
      },
    });

    const leaveMap = new Map(activeLeaves.map((l) => [l.employee_id, l]));

    const dayOfWeek = queryDate.getUTCDay(); // 0 = Sun, 6 = Sat
    // PGE operates on a 6-day workweek (Monday to Saturday); Sunday (0) is company off-day.
    const isStandardWorkday = dayOfWeek !== 0;

    let presentCount = 0;
    let lateCount = 0;
    let onLeaveCount = 0;
    let absentCount = 0;
    let offCount = 0;
    let weekendAttendanceCount = 0;

    const rows: AttendanceAuditRow[] = employees.map((emp) => {
      const att = attendanceMap.get(emp.id);
      const leave = leaveMap.get(emp.id);

      let status: AttendanceAuditRow['status'] = isStandardWorkday ? 'ABSENT' : 'LIBUR';
      let lateMinutes = 0;
      let clockInTime: string | null = null;
      let clockOutTime: string | null = null;
      let clockInLat: number | null = null;
      let clockInLng: number | null = null;
      let clockInPhoto: string | null = null;
      let clockOutPhoto: string | null = null;

      if (leave && !att?.clock_in_time) {
        status = 'ON_LEAVE';
        onLeaveCount++;
      } else if (att) {
        if (!isStandardWorkday) {
          status = 'HADIR_BUKAN_HARI_KERJA';
          weekendAttendanceCount++;
        } else {
          status = att.status;
          if (att.status === 'LATE') lateCount++;
        }
        presentCount++;
        lateMinutes = att.late_minutes;
        clockInTime = att.clock_in_time ? att.clock_in_time.toISOString() : null;
        clockOutTime = att.clock_out_time ? att.clock_out_time.toISOString() : null;
        clockInLat = att.clock_in_lat;
        clockInLng = att.clock_in_lng;
        clockInPhoto = att.clock_in_photo_url;
        clockOutPhoto = att.clock_out_photo_url;
      } else if (leave) {
        status = 'ON_LEAVE';
        onLeaveCount++;
      } else {
        if (isStandardWorkday) {
          status = 'ABSENT';
          absentCount++;
        } else {
          status = 'LIBUR';
          offCount++;
        }
      }

      return {
        employee_id: emp.id,
        full_name: emp.full_name,
        email: emp.email,
        department: emp.department,
        position: emp.position || 'Staff',
        role: emp.role,
        office_name: emp.office?.name || 'Unassigned',
        shift_name: emp.shift?.name || 'Standard',
        shift_hours: emp.shift ? `${emp.shift.start_time} - ${emp.shift.end_time}` : '09:00 - 18:00',
        clock_in_time: clockInTime,
        clock_out_time: clockOutTime,
        status,
        late_minutes: lateMinutes,
        clock_in_lat: clockInLat,
        clock_in_lng: clockInLng,
        clock_in_photo_url: clockInPhoto,
        clock_out_photo_url: clockOutPhoto,
        leave_reason: leave?.reason,
        is_manual_adjustment: att ? att.is_manual_adjustment : false,
        adjustment_reason: att?.adjustment_reason || null,
        day_type: isStandardWorkday ? 'WORKDAY' : 'OFF_DAY',
        attendance_record_id: att?.id || null,
      };
    });

    return {
      date: queryDate.toISOString(),
      is_workday: isStandardWorkday,
      metrics: {
        total_employees: employees.length,
        present_today: presentCount,
        late_today: lateCount,
        absent_today: absentCount,
        on_leave_today: onLeaveCount,
        off_today: offCount,
        weekend_attendance_today: weekendAttendanceCount,
      },
      records: rows,
    };
  }

  /**
   * Manual Attendance Adjustment (Admin Override)
   */
  static async adjustAttendance(
    adminUserId: string,
    data: {
      employee_id: string;
      date: string;
      clock_in_time: string | null;
      clock_out_time: string | null;
      status?: AttendanceStatus;
      reason: string;
    }
  ) {
    if (!data.reason || !data.reason.trim()) {
      throw ApiError.badRequest('Alasan koreksi absensi wajib diisi');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: data.employee_id },
      include: { shift: true },
    });
    if (!employee) throw ApiError.notFound('Employee not found');

    const targetDate = new Date(data.date);
    const queryDate = getNormalizedDate(targetDate);
    const dayOfWeek = queryDate.getUTCDay();
    const dayType = dayOfWeek === 0 ? 'OFF_DAY' : 'WORKDAY';

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        employee_id_date: {
          employee_id: data.employee_id,
          date: queryDate,
        },
      },
    });

    if ((data.status as any) === 'ABSENT' || (data.status as any) === 'LIBUR') {
      if (existing) {
        return prisma.attendanceRecord.delete({
          where: { id: existing.id },
        });
      }
      return null;
    }

    const inTime = data.clock_in_time ? new Date(data.clock_in_time) : null;
    const outTime = data.clock_out_time ? new Date(data.clock_out_time) : null;

    let finalStatus: AttendanceStatus = data.status || AttendanceStatus.ON_TIME;
    let lateMinutes = 0;

    // Intelligent Shift Engine: Auto-calculate ON_TIME vs LATE if clock_in_time is present
    if (inTime && employee.shift) {
      const shiftCalc = calculateAttendanceStatus(
        inTime,
        employee.shift.start_time,
        employee.shift.grace_period_minutes || 0,
        data.status === 'WFH'
      );

      // If user did not force a specific non-standard status (like WFH or OUT_OF_OFFICE):
      if (!data.status || data.status === 'ON_TIME' || data.status === 'LATE' || (data.status as string) === 'AUTO_CALCULATE') {
        finalStatus = shiftCalc.status;
        lateMinutes = shiftCalc.lateMinutes;
      } else if ((data.status as any) === 'LATE') {
        finalStatus = AttendanceStatus.LATE;
        lateMinutes = shiftCalc.lateMinutes || 15;
      } else {
        // Explicit admin override (e.g. WFH, OUT_OF_OFFICE, or explicit dispensation)
        finalStatus = data.status;
        lateMinutes = 0;
      }
    } else if (data.status === 'LATE') {
      lateMinutes = 15;
    }

    if (existing) {
      return prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          clock_in_time: inTime,
          clock_out_time: outTime,
          status: finalStatus,
          late_minutes: lateMinutes,
          is_manual_adjustment: true,
          adjustment_reason: data.reason.trim(),
          adjusted_by_id: adminUserId,
          day_type: dayType,
        },
      });
    } else {
      return prisma.attendanceRecord.create({
        data: {
          employee_id: data.employee_id,
          date: queryDate,
          clock_in_time: inTime,
          clock_out_time: outTime,
          clock_in_lat: 0,
          clock_in_lng: 0,
          clock_in_photo_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23e2e8f0"/><text x="50" y="55" font-size="12" text-anchor="middle" fill="%2364748b">MANUAL</text></svg>',
          status: finalStatus,
          late_minutes: lateMinutes,
          is_manual_adjustment: true,
          adjustment_reason: data.reason.trim(),
          adjusted_by_id: adminUserId,
          day_type: dayType,
        },
      });
    }
  }

  /**
   * Monthly Payroll Aggregation per employee
   */
  static async getPayrollSummary(year: number, month: number) {
    // month is 1-12
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Calculate working days in month (Mon-Fri)
    let expectedWorkingDays = 0;
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) {
        expectedWorkingDays++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const employees = await prisma.employee.findMany({
      include: { shift: true, office: true },
      orderBy: { full_name: 'asc' },
    });

    const attendances = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: LeaveStatus.APPROVED,
        start_date: { lte: endDate },
        end_date: { gte: startDate },
      },
    });

    const approvedOvertimes = await prisma.overtimeRequest.findMany({
      where: {
        status: 'APPROVED',
        date: { gte: startDate, lte: endDate },
      },
    });

    // Payroll Readiness Checks (Blockers/Anomalies)
    const pendingLeaves = await prisma.leaveRequest.count({
      where: {
        status: LeaveStatus.PENDING,
        start_date: { lte: endDate },
        end_date: { gte: startDate },
      },
    });

    const pendingOvertimes = await prisma.overtimeRequest.count({
      where: {
        status: 'PENDING',
        date: { gte: startDate, lte: endDate },
      },
    });

    const missingClockOuts = attendances.filter(
      (a) => a.clock_in_time && !a.clock_out_time
    ).length;

    const totalAnomalies = pendingLeaves + pendingOvertimes + missingClockOuts;
    const isReady = totalAnomalies === 0;

    const payrollData = employees.map((emp) => {
      const empAttendances = attendances.filter((a) => a.employee_id === emp.id);
      const empLeaves = leaves.filter((l) => l.employee_id === emp.id);

      const daysPresent = empAttendances.length;
      const lateRecords = empAttendances.filter((a) => a.status === 'LATE');
      const totalLateMinutes = lateRecords.reduce((sum, r) => sum + r.late_minutes, 0);

      const sickLeaves = empLeaves.filter((l) => l.type === LeaveType.SICK).length;
      const annualLeaves = empLeaves.filter((l) => l.type === LeaveType.ANNUAL).length;
      const unpaidLeaves = empLeaves.filter(
        (l) => l.type === LeaveType.UNPAID || l.type === LeaveType.PERSONAL
      ).length;
      const dutyLeaves = empLeaves.filter((l) => l.type === LeaveType.DUTY).length;

      // Calculate Overtime (clock out past shift.end_time)
      let overtimeHours = 0;
      if (emp.shift) {
        const [endH, endM] = emp.shift.end_time.split(':').map(Number);
        empAttendances.forEach((att) => {
          if (att.clock_out_time) {
            const outDate = new Date(att.clock_out_time);
            const shiftEnd = new Date(att.clock_out_time);
            shiftEnd.setHours(endH, endM, 0, 0);

            if (outDate > shiftEnd) {
              const diffHours = (outDate.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60);
              overtimeHours += Math.round(diffHours * 10) / 10;
            }
          }
        });
      }

      // Add approved SPL (Surat Perintah Lembur) hours
      const empOvertimes = approvedOvertimes.filter((o) => o.employee_id === emp.id);
      const splHours = empOvertimes.reduce((sum, o) => sum + o.duration_hours, 0);
      const totalOvertime = splHours > 0 ? splHours : overtimeHours;

      return {
        employee_id: emp.id,
        employee_id_number: emp.employee_id_number,
        full_name: emp.full_name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        position: emp.position || 'Staff',
        shift_name: emp.shift?.name || 'Standard',
        bank_uob: decryptPII(emp.bank_uob),
        bank_other: decryptPII(emp.bank_other),
        total_days_expected: expectedWorkingDays,
        total_days_present: daysPresent,
        total_late_instances: lateRecords.length,
        total_late_minutes: totalLateMinutes,
        total_sick_leaves: sickLeaves,
        total_annual_leaves: annualLeaves,
        total_unpaid_leaves: unpaidLeaves,
        total_duty_leaves: dutyLeaves,
        annual_leave_quota: emp.annual_leave_quota,
        annual_leave_used: emp.annual_leave_used,
        total_overtime_hours: totalOvertime,
      };
    });

    const totalManDaysPresent = payrollData.reduce((acc, r) => acc + r.total_days_present, 0);
    const totalManDaysExpected = expectedWorkingDays * employees.length;
    const totalOvertimeHours = payrollData.reduce((acc, r) => acc + r.total_overtime_hours, 0);
    const totalLateInstances = payrollData.reduce((acc, r) => acc + r.total_late_instances, 0);
    const totalLateMinutesAll = payrollData.reduce((acc, r) => acc + r.total_late_minutes, 0);
    const totalLeavesTaken = payrollData.reduce(
      (acc, r) => acc + r.total_sick_leaves + r.total_annual_leaves + (r.total_duty_leaves || 0),
      0
    );

    return {
      period: {
        year,
        month,
        expected_working_days: expectedWorkingDays,
      },
      readiness: {
        is_ready: isReady,
        pending_leaves: pendingLeaves,
        pending_overtimes: pendingOvertimes,
        missing_clock_outs: missingClockOuts,
        total_anomalies: totalAnomalies,
      },
      totals: {
        total_man_days_present: totalManDaysPresent,
        total_man_days_expected: totalManDaysExpected,
        total_overtime_hours: Math.round(totalOvertimeHours * 10) / 10,
        total_late_instances: totalLateInstances,
        total_late_minutes: totalLateMinutesAll,
        total_leaves_taken: totalLeavesTaken,
      },
      summary: payrollData,
    };
  }

  /**
   * Export Payroll to CSV or Excel (.xlsx) Buffer
   */
  static async exportPayrollFile(year: number, month: number, format: 'csv' | 'xlsx') {
    const { summary } = await this.getPayrollSummary(year, month);

    const sheetData = summary.map((s) => ({
      'NIK': s.employee_id_number || s.employee_id,
      'Nama Karyawan': s.full_name,
      'Email': s.email,
      'Departemen': s.department,
      'Jabatan': s.position,
      'Shift': s.shift_name,
      'Bank UOB (PGE)': s.bank_uob || '—',
      'Bank Lain': s.bank_other || '—',
      'Hari Kerja Wajib': s.total_days_expected,
      'Hari Hadir Aktual': s.total_days_present,
      'Keterlambatan (Kali)': s.total_late_instances,
      'Keterlambatan (Menit)': s.total_late_minutes,
      'Cuti Sakit (Hari)': s.total_sick_leaves,
      'Cuti Tahunan (Hari)': s.total_annual_leaves,
      'Izin Pribadi / Unpaid': s.total_unpaid_leaves,
      'Tugas Dinas (Hari)': s.total_duty_leaves || 0,
      'Sisa Hak Cuti': `${(s.annual_leave_quota || 12) - (s.annual_leave_used || 0)} / ${s.annual_leave_quota || 12}`,
      'Jam Lembur': s.total_overtime_hours,
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${year}_${month}`);

    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      return {
        buffer: Buffer.from(csvOutput, 'utf-8'),
        contentType: 'text/csv',
        filename: `payroll_${year}_${String(month).padStart(2, '0')}.csv`,
      };
    }

    // Default: XLSX
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: xlsxBuffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `payroll_${year}_${String(month).padStart(2, '0')}.xlsx`,
    };
  }

  /**
   * Get comprehensive visual analytics for executive & HR reporting
   */
  static async getMonthlyAnalytics(year: number, month: number, department?: string) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    const empWhere: any = { is_active: true };
    if (department && department !== 'ALL') {
      empWhere.department = department;
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      include: { shift: true, office: true },
      orderBy: { full_name: 'asc' },
    });

    const attendances = await prisma.attendanceRecord.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(department && department !== 'ALL'
          ? { employee: { department } }
          : {}),
      },
      include: { employee: { include: { shift: true } } },
    });

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: LeaveStatus.APPROVED,
        start_date: { lte: endDate },
        end_date: { gte: startDate },
        ...(department && department !== 'ALL'
          ? { employee: { department } }
          : {}),
      },
    });

    // 1. Calculate Summary
    const totalEmployees = employees.length;
    let expectedWorkingDays = 0;
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) {
        expectedWorkingDays++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const totalPotentialManDays = totalEmployees * expectedWorkingDays;
    let totalPresentDays = 0;
    let totalOnTimeDays = 0;
    let totalLateDays = 0;
    let totalLateMinutes = 0;
    let totalWfhDays = 0;
    let totalWorkMinutes = 0;
    let totalEarlyDepartureDays = 0;
    let totalEarlyDepartureMinutes = 0;

    let lateMinorCount = 0; // <= 15m
    let lateModerateCount = 0; // 16-45m
    let lateSevereCount = 0; // > 45m

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dayLateMap: Record<string, number> = {
      Min: 0,
      Sen: 0,
      Sel: 0,
      Rab: 0,
      Kam: 0,
      Jum: 0,
      Sab: 0,
    };

    attendances.forEach((att) => {
      totalPresentDays++;
      if (att.status === 'ON_TIME' || (att.status as string) === 'HADIR_BUKAN_HARI_KERJA') {
        totalOnTimeDays++;
      } else if (att.status === 'LATE') {
        totalLateDays++;
        const lateMins = att.late_minutes || 0;
        totalLateMinutes += lateMins;

        if (lateMins <= 15) {
          lateMinorCount++;
        } else if (lateMins <= 45) {
          lateModerateCount++;
        } else {
          lateSevereCount++;
        }

        const aDate = new Date(att.date);
        const dayName = dayNames[aDate.getUTCDay()];
        if (dayLateMap[dayName] !== undefined) {
          dayLateMap[dayName]++;
        }
      }

      if (att.status === 'WFH') {
        totalWfhDays++;
      }

      if (att.clock_in_time && att.clock_out_time) {
        const diff = new Date(att.clock_out_time).getTime() - new Date(att.clock_in_time).getTime();
        if (diff > 0) {
          totalWorkMinutes += Math.round(diff / 60000);
        }

        // Early departure check against employee shift
        const empShift = att.employee?.shift;
        if (empShift?.end_time) {
          const [endH, endM] = empShift.end_time.split(':').map(Number);
          const outDate = new Date(att.clock_out_time);
          const shiftEnd = new Date(att.clock_out_time);
          shiftEnd.setHours(endH, endM, 0, 0);

          if (outDate < shiftEnd) {
            const earlyDiffMins = Math.round((shiftEnd.getTime() - outDate.getTime()) / 60000);
            if (earlyDiffMins >= 10 && earlyDiffMins < 480) {
              totalEarlyDepartureDays++;
              totalEarlyDepartureMinutes += earlyDiffMins;
            }
          }
        }
      }
    });

    const attendanceRate = totalPotentialManDays > 0
      ? Math.min(100, Math.round((totalPresentDays / totalPotentialManDays) * 100))
      : 100;

    const onTimeRate = totalPresentDays > 0
      ? Math.round((totalOnTimeDays / totalPresentDays) * 100)
      : 100;

    const totalApprovedLeaves = leaves.length;
    const totalAlphaDays = Math.max(0, totalPotentialManDays - totalPresentDays - totalApprovedLeaves);
    const alphaRate = totalPotentialManDays > 0
      ? Math.min(100, Math.round((totalAlphaDays / totalPotentialManDays) * 100))
      : 0;

    const avgLateMinutes = totalLateDays > 0 ? Math.round(totalLateMinutes / totalLateDays) : 0;

    // Determine peak late day
    let peakLateDay = '—';
    let maxLateCount = 0;
    const dayFullNames: Record<string, string> = {
      Min: 'Minggu',
      Sen: 'Senin',
      Sel: 'Selasa',
      Rab: 'Rabu',
      Kam: 'Kamis',
      Jum: 'Jumat',
      Sab: 'Sabtu',
    };
    for (const [dayKey, count] of Object.entries(dayLateMap)) {
      if (count > maxLateCount) {
        maxLateCount = count;
        const pct = totalLateDays > 0 ? Math.round((count / totalLateDays) * 100) : 0;
        peakLateDay = `${dayFullNames[dayKey]} (${pct}%)`;
      }
    }

    // 2. Daily Trends
    const dailyTrends = [];

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dObj = new Date(Date.UTC(year, month - 1, d));
      const dateStr = dObj.toISOString().split('T')[0];
      const isWorkday = dObj.getUTCDay() !== 0;

      const dayRecords = attendances.filter((a) => {
        const aDate = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date).split('T')[0];
        return aDate === dateStr;
      });

      const onTime = dayRecords.filter((r) => r.status === 'ON_TIME' || (r.status as string) === 'HADIR_BUKAN_HARI_KERJA').length;
      const late = dayRecords.filter((r) => r.status === 'LATE').length;
      const wfh = dayRecords.filter((r) => r.status === 'WFH').length;
      const present = dayRecords.length;
      const absent = isWorkday ? Math.max(0, totalEmployees - present) : 0;

      dailyTrends.push({
        date: dateStr,
        day: d,
        day_name: dayNames[dObj.getUTCDay()],
        is_workday: isWorkday,
        present,
        on_time: onTime,
        late,
        wfh,
        absent,
      });
    }

    // 3. Department Breakdown with Health Score
    const deptMap = new Map<string, {
      employees: number;
      present: number;
      onTimeCount: number;
      lateCount: number;
      lateMinutes: number;
      wfhCount: number;
    }>();

    employees.forEach((emp) => {
      const dept = emp.department || 'General';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { employees: 0, present: 0, onTimeCount: 0, lateCount: 0, lateMinutes: 0, wfhCount: 0 });
      }
      deptMap.get(dept)!.employees += 1;
    });

    attendances.forEach((att) => {
      const dept = att.employee?.department || 'General';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { employees: 1, present: 0, onTimeCount: 0, lateCount: 0, lateMinutes: 0, wfhCount: 0 });
      }
      const item = deptMap.get(dept)!;
      item.present += 1;
      if (att.status === 'ON_TIME' || (att.status as string) === 'HADIR_BUKAN_HARI_KERJA') {
        item.onTimeCount += 1;
      } else if (att.status === 'LATE') {
        item.lateCount += 1;
        item.lateMinutes += att.late_minutes || 0;
      }
      if (att.status === 'WFH') {
        item.wfhCount += 1;
      }
    });

    const departmentBreakdown = Array.from(deptMap.entries()).map(([department, data]) => {
      const deptPotential = data.employees * expectedWorkingDays;
      const rate = deptPotential > 0 ? Math.min(100, Math.round((data.present / deptPotential) * 100)) : 100;
      const onTimeRatio = data.present > 0 ? Math.round((data.onTimeCount / data.present) * 100) : 100;
      
      // Balanced HR Health Score (0-100)
      const latePenalty = data.present > 0 ? Math.min(15, Math.round((data.lateMinutes / (data.present * 30)) * 10)) : 0;
      const rawScore = Math.round((rate * 0.55) + (onTimeRatio * 0.45) - latePenalty);
      const healthScore = Math.max(0, Math.min(100, rawScore));
      const healthStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL' =
        healthScore >= 85 ? 'EXCELLENT' : healthScore >= 70 ? 'GOOD' : healthScore >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL';

      return {
        department,
        total_employees: data.employees,
        total_present: data.present,
        attendance_rate: rate,
        on_time_count: data.onTimeCount,
        total_late_count: data.lateCount,
        total_late_minutes: data.lateMinutes,
        wfh_count: data.wfhCount,
        health_score: healthScore,
        health_status: healthStatus,
      };
    });

    // 4. Employee Rankings (Top Punctual & Top Late with Phone for Counseling)
    const empStats = employees.map((emp) => {
      const empAtt = attendances.filter((a) => a.employee_id === emp.id);
      const onTimeCount = empAtt.filter((a) => a.status === 'ON_TIME' || (a.status as string) === 'HADIR_BUKAN_HARI_KERJA').length;
      const lateCount = empAtt.filter((a) => a.status === 'LATE').length;
      const lateMins = empAtt.reduce((sum, a) => sum + (a.late_minutes || 0), 0);
      return {
        id: emp.id,
        name: emp.full_name,
        department: emp.department,
        position: emp.position,
        phone: emp.phone,
        days_present: empAtt.length,
        on_time_count: onTimeCount,
        late_count: lateCount,
        late_minutes: lateMins,
      };
    });

    const topPunctual = [...empStats]
      .filter((e) => e.days_present > 0)
      .sort((a, b) => b.on_time_count - a.on_time_count || a.late_count - b.late_count)
      .slice(0, 5);

    const topLate = [...empStats]
      .filter((e) => e.late_count > 0)
      .sort((a, b) => b.late_minutes - a.late_minutes || b.late_count - a.late_count)
      .slice(0, 5);

    return {
      period: {
        year,
        month,
        expected_working_days: expectedWorkingDays,
        total_days_in_month: totalDaysInMonth,
      },
      summary: {
        total_employees: totalEmployees,
        attendance_rate: attendanceRate,
        on_time_rate: onTimeRate,
        total_present_days: totalPresentDays,
        total_late_days: totalLateDays,
        total_late_minutes: totalLateMinutes,
        avg_late_minutes: avgLateMinutes,
        late_minor_count: lateMinorCount,
        late_moderate_count: lateModerateCount,
        late_severe_count: lateSevereCount,
        total_early_departure_days: totalEarlyDepartureDays,
        total_early_departure_minutes: totalEarlyDepartureMinutes,
        total_wfh_days: totalWfhDays,
        total_work_hours: Math.round(totalWorkMinutes / 60),
        total_approved_leaves: totalApprovedLeaves,
        total_alpha_days: totalAlphaDays,
        alpha_rate: alphaRate,
        peak_late_day: peakLateDay,
      },
      daily_trends: dailyTrends,
      department_breakdown: departmentBreakdown,
      top_punctual: topPunctual,
      top_late: topLate,
    };
  }

  /**
   * Get 31-day Monthly Attendance Matrix data for HR reporting & preview
   */
  static async getAttendanceMatrixData(year: number, month: number, department?: string) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    // 1. Prepare Days metadata
    const daysMeta: Array<{
      dayNumber: number;
      dateStr: string;
      dayName: string;
      isWeekend: boolean;
    }> = [];

    let expectedWorkingDays = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dObj = new Date(Date.UTC(year, month - 1, d));
      const isWeekend = dObj.getUTCDay() === 0 || dObj.getUTCDay() === 6;
      if (!isWeekend) expectedWorkingDays++;
      daysMeta.push({
        dayNumber: d,
        dateStr: dObj.toISOString().split('T')[0],
        dayName: dayNames[dObj.getUTCDay()],
        isWeekend,
      });
    }

    // 2. Fetch Employees
    const empWhere: any = { is_active: true };
    if (department && department !== 'ALL') {
      empWhere.department = department;
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      include: { shift: true },
      orderBy: [
        { department: 'asc' },
        { employee_id_number: 'asc' },
        { full_name: 'asc' }
      ],
    });

    // 3. Fetch all attendance records in month
    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(department && department !== 'ALL' ? { employee: { department } } : {}),
      },
    });

    // 4. Fetch all approved leaves in month
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: LeaveStatus.APPROVED,
        start_date: { lte: endDate },
        end_date: { gte: startDate },
        ...(department && department !== 'ALL' ? { employee: { department } } : {}),
      },
    });

    // 5. Fetch shift rosters in month
    const rosters = await prisma.shiftRoster.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(department && department !== 'ALL' ? { employee: { department } } : {}),
      },
      include: { shift: true },
    });

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Index records: `${empId}_${dateStr}`
    const recordMap = new Map<string, typeof records[0]>();
    records.forEach((r) => {
      const dStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
      recordMap.set(`${r.employee_id}_${dStr}`, r);
    });

    // Index rosters: `${empId}_${dateStr}`
    const rosterMap = new Map<string, typeof rosters[0]>();
    rosters.forEach((rst) => {
      const dStr = rst.date instanceof Date ? rst.date.toISOString().split('T')[0] : String(rst.date).split('T')[0];
      rosterMap.set(`${rst.employee_id}_${dStr}`, rst);
    });

    // 6. Build Matrix Rows
    const rows = employees.map((emp, index) => {
      const dayCells: Record<number, { code: string; label: string; detail?: string }> = {};

      let presentCount = 0;
      let onTimeCount = 0;
      let lateCount = 0;
      let lateMinutes = 0;
      let sickCount = 0;
      let izinCount = 0;
      let cutiCount = 0;
      let alpaCount = 0;
      let offCount = 0;
      let totalWorkMinutes = 0;

      daysMeta.forEach(({ dayNumber, dateStr, isWeekend }) => {
        const att = recordMap.get(`${emp.id}_${dateStr}`);
        const rst = rosterMap.get(`${emp.id}_${dateStr}`);

        // Check if covered by leave
        const matchingLeave = leaves.find((lv) => {
          if (lv.employee_id !== emp.id) return false;
          const lvStart = lv.start_date.toISOString().split('T')[0];
          const lvEnd = lv.end_date.toISOString().split('T')[0];
          return dateStr >= lvStart && dateStr <= lvEnd;
        });

        if (att) {
          if (att.status === 'ON_TIME' || (att.status as string) === 'HADIR_BUKAN_HARI_KERJA') {
            dayCells[dayNumber] = { code: 'H', label: 'Hadir', detail: 'Tepat Waktu' };
            presentCount++;
            onTimeCount++;
          } else if (att.status === 'LATE') {
            const mins = att.late_minutes || 0;
            dayCells[dayNumber] = { code: 'T', label: 'Terlambat', detail: `${mins}m` };
            presentCount++;
            lateCount++;
            lateMinutes += mins;
          } else if (att.status === 'WFH') {
            dayCells[dayNumber] = { code: 'WFH', label: 'WFH', detail: 'Bekerja Remote' };
            presentCount++;
            onTimeCount++;
          } else {
            dayCells[dayNumber] = { code: 'H', label: 'Hadir' };
            presentCount++;
          }

          if (att.clock_in_time && att.clock_out_time) {
            const diff = new Date(att.clock_out_time).getTime() - new Date(att.clock_in_time).getTime();
            if (diff > 0) totalWorkMinutes += Math.round(diff / 60000);
          }
        } else if (matchingLeave) {
          if (matchingLeave.type === LeaveType.SICK) {
            dayCells[dayNumber] = { code: 'S', label: 'Sakit', detail: matchingLeave.reason };
            sickCount++;
          } else if (matchingLeave.type === LeaveType.ANNUAL) {
            dayCells[dayNumber] = { code: 'C', label: 'Cuti Tahunan', detail: matchingLeave.reason };
            cutiCount++;
          } else {
            dayCells[dayNumber] = { code: 'I', label: 'Izin', detail: matchingLeave.reason };
            izinCount++;
          }
        } else if (rst && rst.shift?.name?.toUpperCase().includes('OFF')) {
          dayCells[dayNumber] = { code: 'OFF', label: 'Libur Shift' };
          offCount++;
        } else if (isWeekend && !rst) {
          dayCells[dayNumber] = { code: '-', label: 'Libur Akhir Pekan' };
        } else {
          if (dateStr < todayStr) {
            dayCells[dayNumber] = { code: 'A', label: 'Alpa' };
            alpaCount++;
          } else {
            dayCells[dayNumber] = { code: '', label: 'Belum Berjalan' };
          }
        }
      });

      const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
      const attRate = expectedWorkingDays > 0
        ? Math.min(100, Math.round((presentCount / expectedWorkingDays) * 100))
        : 100;

      return {
        no: index + 1,
        employee_id: emp.id,
        employee_id_number: emp.employee_id_number || `PGE-${String(index + 1).padStart(3, '0')}`,
        full_name: emp.full_name,
        nickname: emp.nickname || '',
        department: emp.department || 'Team PGE',
        position: emp.position || 'Staff',
        shift_name: emp.shift?.name || 'Shift Regular',
        days: dayCells,
        summary: {
          present_count: presentCount,
          on_time_count: onTimeCount,
          late_count: lateCount,
          late_minutes: lateMinutes,
          sick_count: sickCount,
          izin_count: izinCount,
          cuti_count: cutiCount,
          alpa_count: alpaCount,
          off_count: offCount,
          total_work_hours: totalWorkHours,
          attendance_percentage: attRate,
        },
      };
    });

    return {
      period: {
        year,
        month,
        month_name: monthNames[month - 1],
        expected_working_days: expectedWorkingDays,
        total_days_in_month: totalDaysInMonth,
        department_filter: department || 'ALL',
      },
      days: daysMeta,
      rows,
    };
  }

  /**
   * Export Full Monthly Attendance Matrix into formatted Excel (.xlsx) file
   */
  static async exportAttendanceMatrixFile(year: number, month: number, department?: string) {
    const data = await this.getAttendanceMatrixData(year, month, department);

    // Build Sheet 1: Matrix Data
    const aoa: any[][] = [];

    // 1. Company Header
    aoa.push(['TEAM PGE - REKAPITULASI PRESENSI & KEHADIRAN KARYAWAN']);
    aoa.push([`Periode: ${data.period.month_name} ${data.period.year} | Departemen: ${data.period.department_filter} | Hari Kerja Standar: ${data.period.expected_working_days} Hari`]);
    aoa.push([`Waktu Cetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`]);
    aoa.push([]); // blank

    // 2. Table Column Headers
    const headerRow1: any[] = ['No', 'NIK', 'Nama Lengkap', 'Departemen', 'Jabatan'];
    const headerRow2: any[] = ['', '', '', '', ''];

    data.days.forEach((d) => {
      headerRow1.push(d.dayNumber);
      headerRow2.push(d.dayName);
    });

    // Summary Column Headers
    headerRow1.push('H', 'T', 'Mnt T', 'S', 'I', 'C', 'A', 'OFF', 'Jam Kerja', '% Hadir');
    headerRow2.push('Hadir', 'Telat', 'Menit', 'Sakit', 'Izin', 'Cuti', 'Alpa', 'Libur', 'Total', '%');

    aoa.push(headerRow1);
    aoa.push(headerRow2);

    // 3. Employee Rows
    data.rows.forEach((row) => {
      const r: any[] = [
        row.no,
        row.employee_id_number,
        row.full_name,
        row.department,
        row.position,
      ];

      data.days.forEach((d) => {
        const cell = row.days[d.dayNumber];
        r.push(cell ? cell.code : '');
      });

      r.push(
        row.summary.present_count,
        row.summary.late_count,
        row.summary.late_minutes,
        row.summary.sick_count,
        row.summary.izin_count,
        row.summary.cuti_count,
        row.summary.alpa_count,
        row.summary.off_count,
        row.summary.total_work_hours,
        `${row.summary.attendance_percentage}%`
      );

      aoa.push(r);
    });

    // 4. Blank & Footer Legend
    aoa.push([]);
    aoa.push(['KETERANGAN KODE PRESENSI:']);
    aoa.push(['H: Hadir Tepat Waktu | T: Terlambat | S: Sakit | I: Izin | C: Cuti Tahunan | A: Alpa (Tanpa Keterangan) | OFF: Libur Shift | -: Akhir Pekan']);
    aoa.push([]);

    // 5. Signature Boxes
    aoa.push(['', '', 'Dibuat Oleh:', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Disetujui Oleh:']);
    aoa.push([]);
    aoa.push([]);
    aoa.push(['', '', '( HRD Officer Team PGE )', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '( Pimpinan / Manajemen PGE )']);

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Auto-fit Column Widths
    const colWidths: any[] = [
      { wch: 5 },  // No
      { wch: 12 }, // NIK
      { wch: 28 }, // Nama Lengkap
      { wch: 18 }, // Departemen
      { wch: 20 }, // Jabatan
    ];

    // Day columns
    data.days.forEach(() => {
      colWidths.push({ wch: 4 });
    });

    // Summary columns
    colWidths.push(
      { wch: 6 },  // H
      { wch: 6 },  // T
      { wch: 8 },  // Mnt T
      { wch: 6 },  // S
      { wch: 6 },  // I
      { wch: 6 },  // C
      { wch: 6 },  // A
      { wch: 6 },  // OFF
      { wch: 10 }, // Jam Kerja
      { wch: 9 }   // %
    );

    worksheet['!cols'] = colWidths;

    // Create Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Matriks_${data.period.month_name}_${year}`);

    // Build Sheet 2: Detailed Payroll Summary
    const { summary } = await this.getPayrollSummary(year, month);
    const summarySheetData = summary.map((s) => ({
      'NIK': s.employee_id,
      'Nama Karyawan': s.full_name,
      'Departemen': s.department,
      'Jabatan': s.position,
      'Shift': s.shift_name,
      'Hari Wajib Kerja': s.total_days_expected,
      'Hari Hadir': s.total_days_present,
      'Jumlah Telat': s.total_late_instances,
      'Total Menit Telat': s.total_late_minutes,
      'Sakit (Hari)': s.total_sick_leaves,
      'Cuti (Hari)': s.total_annual_leaves,
      'Izin (Hari)': s.total_unpaid_leaves,
      'Dinas Luar': s.total_duty_leaves,
      'Sisa Kuota Cuti': `${s.annual_leave_quota - s.annual_leave_used} / ${s.annual_leave_quota}`,
      'Total Jam Lembur': s.total_overtime_hours,
    }));
    const summaryWorksheet = XLSX.utils.json_to_sheet(summarySheetData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Rekap_Akumulasi_HRD');

    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Rekap_Presensi_PGE_${data.period.month_name}_${year}.xlsx`;

    return {
      buffer: xlsxBuffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename,
    };
  }
}
