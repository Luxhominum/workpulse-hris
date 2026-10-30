import { z } from 'zod';

export const createOfficeSchema = z.object({
  name: z.string().min(2, 'Office name must be at least 2 characters'),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  radius_meters: z.number().int().positive().default(50),
});

export const updateOfficeSchema = createOfficeSchema.partial();

export type CreateOfficeInput = z.infer<typeof createOfficeSchema>;
export type UpdateOfficeInput = z.infer<typeof updateOfficeSchema>;
