import { z } from 'zod';

export const projectStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED']);

export const createProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().cuid(),
  status: projectStatusEnum.optional().default('DRAFT'),
  budget: z.number().optional(),
  startDate: z.string().datetime().optional().or(z.date()),
  endDate: z.string().datetime().optional().or(z.date()),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: projectStatusEnum.optional(),
  progress: z.number().min(0).max(100).optional(),
  budget: z.number().optional().nullable(),
  startDate: z.string().datetime().optional().nullable().or(z.date()),
  endDate: z.string().datetime().optional().nullable().or(z.date()),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>;
