import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(8000),
});

export type CreateCommentBody = z.infer<typeof createCommentSchema>;
