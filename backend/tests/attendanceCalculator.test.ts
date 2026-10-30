import { describe, it, expect } from 'vitest';
import { calculateAttendanceStatus, getNormalizedDate } from '../src/utils/attendanceCalculator';
import { AttendanceStatus } from '@prisma/client';

describe('Shift & Late Calculation Engine', () => {
  const shiftStart = '09:00';
  const graceMinutes = 15;

  it('should normalize date to midnight UTC', () => {
    const testDate = new Date('2026-10-20T14:35:10.000Z');
    const normalized = getNormalizedDate(testDate);

    expect(normalized.getUTCHours()).toBe(0);
    expect(normalized.getUTCMinutes()).toBe(0);
    expect(normalized.getUTCSeconds()).toBe(0);
    expect(normalized.toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });

  it('should mark ON_TIME when arriving before shift start', () => {
    const arrival = new Date('2026-10-20T08:50:00');
    const result = calculateAttendanceStatus(arrival, shiftStart, graceMinutes, false);

    expect(result.status).toBe(AttendanceStatus.ON_TIME);
    expect(result.lateMinutes).toBe(0);
  });

  it('should mark ON_TIME when arriving during grace period', () => {
    const arrival = new Date('2026-10-20T09:12:00');
    const result = calculateAttendanceStatus(arrival, shiftStart, graceMinutes, false);

    expect(result.status).toBe(AttendanceStatus.ON_TIME);
    expect(result.lateMinutes).toBe(0);
  });

  it('should mark ON_TIME when arriving exactly at grace period limit', () => {
    const arrival = new Date('2026-10-20T09:15:00');
    const result = calculateAttendanceStatus(arrival, shiftStart, graceMinutes, false);

    expect(result.status).toBe(AttendanceStatus.ON_TIME);
    expect(result.lateMinutes).toBe(0);
  });

  it('should mark LATE and calculate total late minutes when past grace period', () => {
    // 09:35 is 35 minutes after shift start (09:00), past 15-minute grace
    const arrival = new Date('2026-10-20T09:35:00');
    const result = calculateAttendanceStatus(arrival, shiftStart, graceMinutes, false);

    expect(result.status).toBe(AttendanceStatus.LATE);
    expect(result.lateMinutes).toBe(35);
  });

  it('should mark WFH when arriving within grace window remotely with permission', () => {
    const arrival = new Date('2026-10-20T09:05:00');
    const result = calculateAttendanceStatus(arrival, shiftStart, graceMinutes, true);

    expect(result.status).toBe(AttendanceStatus.WFH);
    expect(result.lateMinutes).toBe(0);
  });

  it('should mark LATE even if WFH when checking in past grace period', () => {
    const arrival = new Date('2026-10-20T10:15:00');
    const result = calculateAttendanceStatus(arrival, shiftStart, graceMinutes, true);

    expect(result.status).toBe(AttendanceStatus.LATE);
    expect(result.lateMinutes).toBe(75); // 1 hour 15 minutes
  });
});
