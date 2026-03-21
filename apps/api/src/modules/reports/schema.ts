import { z } from 'zod';

export const timeReportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  projectId: z.string().cuid().optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

export type TimeReportQuery = z.infer<typeof timeReportQuerySchema>;

export function parseYmdUtc(s: string): Date {
  const parts = s.split('-').map((x) => Number(x));
  const y = parts[0] ?? 0;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, mo - 1, d));
}
