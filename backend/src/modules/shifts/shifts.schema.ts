import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createShiftSchema = z.object({
  name: z.string().min(2, 'Shift name must be at least 2 characters'),
  start_time: z.string().regex(timeRegex, 'Start time must be in HH:mm format (e.g. 09:00)'),
  end_time: z.string().regex(timeRegex, 'End time must be in HH:mm format (e.g. 18:00)'),
  grace_period_minutes: z.number().int().min(0).default(10),
});

export const updateShiftSchema = createShiftSchema.partial();

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
