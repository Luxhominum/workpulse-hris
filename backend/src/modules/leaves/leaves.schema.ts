import { z } from 'zod';
import { LeaveType } from '@prisma/client';

export const createLeaveSchema = z.object({
  type: z.nativeEnum(LeaveType),
  start_date: z.string().or(z.date()),
  end_date: z.string().or(z.date()),
  reason: z.string().min(3, 'Reason must be at least 3 characters long'),
  attachment_url: z.string().optional(),
});

export const adminCreateLeaveSchema = z.object({
  employee_id: z.string().min(1, 'Pilih karyawan wajib diisi'),
  type: z.nativeEnum(LeaveType),
  start_date: z.string().or(z.date()),
  end_date: z.string().or(z.date()),
  reason: z.string().min(3, 'Alasan izin wajib diisi'),
  attachment_url: z.string().optional(),
});

export const reviewLeaveSchema = z.object({
  rejection_reason: z.string().optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type AdminCreateLeaveInput = z.infer<typeof adminCreateLeaveSchema>;
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;
