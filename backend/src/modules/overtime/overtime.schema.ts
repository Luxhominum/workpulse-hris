import { z } from 'zod';

export const CreateOvertimeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam mulai harus HH:mm (contoh: 17:00)'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam selesai harus HH:mm (contoh: 21:00)'),
  reason: z.string().min(5, 'Uraian tugas lembur minimal 5 karakter'),
});

export const ApproveOvertimeSchema = z.object({
  approval_note: z.string().optional(),
});

export const RejectOvertimeSchema = z.object({
  approval_note: z.string().min(3, 'Alasan penolakan minimal 3 karakter'),
});

export type CreateOvertimeInput = z.infer<typeof CreateOvertimeSchema>;
export type ApproveOvertimeInput = z.infer<typeof ApproveOvertimeSchema>;
export type RejectOvertimeInput = z.infer<typeof RejectOvertimeSchema>;
