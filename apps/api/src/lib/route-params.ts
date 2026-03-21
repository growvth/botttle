import type { FastifyRequest } from 'fastify';

/**
 * Under `/api/projects`, Fastify merges routes that use `:id` with routes that use `:projectId`
 * for the same path segment. The runtime param may be either `id` or `projectId`.
 */
export function projectIdFromRequest(request: FastifyRequest): string | undefined {
  const p = request.params as { id?: string; projectId?: string };
  const v = p.projectId ?? p.id;
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
