import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().optional(),
  disabled: z.boolean().optional(),
  role: z.enum(['ADMIN', 'CLIENT']).optional(),
  clientId: z.string().cuid().nullish(),
});

export type UpdateUserBody = z.infer<typeof updateUserSchema>;
