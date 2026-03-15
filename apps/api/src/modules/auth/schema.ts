import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'CLIENT']).optional().default('CLIENT'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
