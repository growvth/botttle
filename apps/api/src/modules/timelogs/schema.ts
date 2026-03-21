import { z } from 'zod';

export const createTimeLogSchema = z.object({
  description: z.string().optional(),
  billable: z.boolean().optional(),
  startedAt: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.date()]).optional(),
  endedAt: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.date()]).optional(),
});

export type CreateTimeLogBody = z.infer<typeof createTimeLogSchema>;

export const stopTimeLogSchema = z.object({
  endedAt: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.date()]).optional(),
});

export type StopTimeLogBody = z.infer<typeof stopTimeLogSchema>;

