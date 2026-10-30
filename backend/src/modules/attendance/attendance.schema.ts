import { z } from 'zod';

export const clockInSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.coerce.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  idempotency_key: z.string().optional(),
  client_timestamp: z.string().optional(),
  is_mock_location: z.coerce.boolean().optional(),
  mock_details: z.string().optional(),
});

export const clockOutSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.coerce.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  idempotency_key: z.string().optional(),
  client_timestamp: z.string().optional(),
  is_mock_location: z.coerce.boolean().optional(),
  mock_details: z.string().optional(),
});

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
