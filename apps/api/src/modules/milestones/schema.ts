import { z } from 'zod';

export const milestoneStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']);

export const createMilestoneSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().datetime().optional().or(z.date()),
  status: milestoneStatusEnum.optional().default('PENDING'),
  completionPercentage: z.number().min(0).max(100).optional().default(0),
  description: z.string().optional(),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional().nullable().or(z.date()),
  status: milestoneStatusEnum.optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
  description: z.string().optional().nullable(),
});

export type CreateMilestoneBody = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneBody = z.infer<typeof updateMilestoneSchema>;
