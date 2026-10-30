import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middlewares/errorHandler';

function getNormalizedDate(dateStrOrObj: string | Date): Date {
  const d = new Date(dateStrOrObj);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export class RosterService {
  /**
   * Get all active employees with their scheduled roster for a given month and year
   */
  static async getMonthlyRoster(year: number, month: number, department?: string) {
    // month is 1-indexed (1 to 12)
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const whereEmp: any = { is_active: true };
    if (department && department !== 'ALL') {
      whereEmp.department = department;
    }

    const employees = await prisma.employee.findMany({
      where: whereEmp,
      select: {
        id: true,
        full_name: true,
        nickname: true,
        employee_id_number: true,
        department: true,
        position: true,
        stifin: true,
        shift: {
          select: {
            id: true,
            name: true,
            start_time: true,
            end_time: true,
          },
        },
        shift_rosters: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            shift: {
              select: {
                id: true,
                name: true,
                start_time: true,
                end_time: true,
              },
            },
          },
        },
      },
      orderBy: [{ department: 'asc' }, { full_name: 'asc' }],
    });

    const shifts = await prisma.shift.findMany({
      orderBy: { start_time: 'asc' },
    });

    return {
      year,
      month,
      shifts,
      employees,
    };
  }

  /**
   * Assign shift to one or multiple employees across a date range
   */
  static async assignRoster(data: {
    employee_ids: string[];
    shift_id: string;
    start_date: string;
    end_date: string;
    notes?: string;
  }) {
    const shift = await prisma.shift.findUnique({
      where: { id: data.shift_id },
    });
    if (!shift) {
      throw ApiError.notFound('Target shift not found');
    }

    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw ApiError.badRequest('Invalid start_date or end_date');
    }
    if (start > end) {
      throw ApiError.badRequest('start_date must be before or equal to end_date');
    }

    // Generate date array
    const dates: Date[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(getNormalizedDate(curr));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    let affectedCount = 0;
    for (const empId of data.employee_ids) {
      for (const d of dates) {
        await prisma.shiftRoster.upsert({
          where: {
            employee_id_date: {
              employee_id: empId,
              date: d,
            },
          },
          create: {
            employee_id: empId,
            shift_id: data.shift_id,
            date: d,
            notes: data.notes || null,
          },
          update: {
            shift_id: data.shift_id,
            notes: data.notes || null,
          },
        });
        affectedCount++;
      }
    }

    return {
      success: true,
      message: `Berhasil menugaskan roster shift untuk ${data.employee_ids.length} karyawan (${dates.length} hari)`,
      totalAssignments: affectedCount,
    };
  }

  /**
   * Reset / Delete an override roster on a date so employee reverts to default shift
   */
  static async deleteRoster(employeeId: string, dateStr: string) {
    const normDate = getNormalizedDate(dateStr);
    try {
      await prisma.shiftRoster.delete({
        where: {
          employee_id_date: {
            employee_id: employeeId,
            date: normDate,
          },
        },
      });
      return { success: true, message: 'Roster di-reset ke shift standar' };
    } catch {
      return { success: true, message: 'Tidak ada roster khusus pada tanggal tersebut' };
    }
  }

  /**
   * For Mobile ESS: Get employee's personalized shift calendar for a month
   */
  static async getMySchedule(employeeId: string, year: number, month: number) {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        full_name: true,
        shift: true,
        shift_rosters: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            shift: true,
          },
        },
      },
    });

    if (!emp) throw ApiError.notFound('Employee not found');

    return {
      year,
      month,
      defaultShift: emp.shift,
      rosterOverrides: emp.shift_rosters,
    };
  }
}
