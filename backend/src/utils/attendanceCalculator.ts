import { AttendanceStatus } from '@prisma/client';

export interface AttendanceStatusResult {
  status: AttendanceStatus;
  lateMinutes: number;
  shiftStartTime: Date;
  graceDeadline: Date;
}

/**
 * Normalizes a date to midnight UTC so daily uniqueness constraints
 * (employee_id, date) operate on date-only granularity.
 */
export function getNormalizedDate(date: Date = new Date()): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Calculates attendance status (ON_TIME, LATE, WFH) and late minutes
 * based strictly on server time and employee shift settings.
 *
 * @param currentTime Server timestamp
 * @param shiftStartTimeStr "HH:mm" formatted string e.g. "09:00"
 * @param gracePeriodMinutes Allowed grace minutes e.g. 10
 * @param isWfh Whether the employee is working remotely
 */
export function calculateAttendanceStatus(
  currentTime: Date,
  shiftStartTimeStr: string,
  gracePeriodMinutes: number,
  isWfh = false
): AttendanceStatusResult {
  const [startHour, startMin] = shiftStartTimeStr.split(':').map(Number);

  // Construct shift start time on the same local date as currentTime
  const shiftStartTime = new Date(currentTime);
  shiftStartTime.setHours(startHour, startMin, 0, 0);

  // Construct grace deadline
  const graceDeadline = new Date(shiftStartTime.getTime() + gracePeriodMinutes * 60 * 1000);

  if (currentTime.getTime() > graceDeadline.getTime()) {
    // Current time is past grace period: Mark as LATE
    const diffMs = currentTime.getTime() - shiftStartTime.getTime();
    const lateMinutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));

    return {
      status: AttendanceStatus.LATE,
      lateMinutes,
      shiftStartTime,
      graceDeadline,
    };
  }

  // Current time is within acceptable arrival window
  return {
    status: isWfh ? AttendanceStatus.WFH : AttendanceStatus.ON_TIME,
    lateMinutes: 0,
    shiftStartTime,
    graceDeadline,
  };
}
