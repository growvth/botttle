import type { FastifyRequest } from 'fastify';
import { prisma, type Prisma } from '@botttle/db';
import type { AuthenticatedRequest } from '../modules/auth/hooks.js';

export function clientIp(request: FastifyRequest): string | null {
  const xf = request.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const ip = request.ip;
  return ip ? String(ip).slice(0, 64) : null;
}

/**
 * Persists an audit row. Never throws; failures are swallowed so mutations stay successful.
 */
export function recordAudit(opts: {
  request?: FastifyRequest;
  /** When omitted and `request` is authenticated, uses JWT subject. */
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  /** Stored as JSON; must be JSON-serializable. */
  metadata?: Prisma.InputJsonValue | Record<string, unknown>;
}): void {
  const ipAddress = opts.request ? clientIp(opts.request) : null;
  const rawUa = opts.request?.headers['user-agent'];
  const userAgent = typeof rawUa === 'string' ? rawUa.slice(0, 512) : null;

  let actor: string | null;
  if (opts.actorUserId !== undefined) {
    actor = opts.actorUserId;
  } else if (opts.request) {
    const u = (opts.request as AuthenticatedRequest).user;
    actor = u?.sub ?? null;
  } else {
    actor = null;
  }

  void prisma.auditLog
    .create({
      data: {
        actorUserId: actor,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
        ...(opts.metadata !== undefined
          ? { metadata: opts.metadata as Prisma.InputJsonValue }
          : {}),
      },
    })
    .catch(() => {
      /* ignore */
    });
}
