import { z } from 'zod';

export const taskStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']);

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: taskStatusEnum.optional().default('PENDING'),
  dueDate: z.string().datetime().optional().or(z.date()),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: taskStatusEnum.optional(),
  dueDate: z.string().datetime().optional().nullable().or(z.date()),
});

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
