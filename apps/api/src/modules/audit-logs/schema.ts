import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
  skip: z.coerce.number().int().min(0).max(50_000).optional().default(0),
  action: z.string().max(120).optional(),
  entityType: z.string().max(64).optional(),
});
