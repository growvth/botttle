import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from './service.js';
import { error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';

export type AuthenticatedRequest = FastifyRequest & {
  user: { sub: string; email: string; role: string };
};

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return reply.status(HttpStatus.UNAUTHORIZED).send(error('UNAUTHORIZED', 'Missing or invalid authorization'));
  }
  const payload = await verifyAccessToken(token);
  if (!payload) {
    return reply.status(HttpStatus.UNAUTHORIZED).send(error('UNAUTHORIZED', 'Invalid or expired token'));
  }
  (request as AuthenticatedRequest).user = payload;
}

export function requireRole(role: string) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    if (!authRequest.user) {
      return reply.status(HttpStatus.UNAUTHORIZED).send(error('UNAUTHORIZED', 'Not authenticated'));
    }
    if (authRequest.user.role !== role) {
      return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Insufficient permissions'));
    }
  };
}
