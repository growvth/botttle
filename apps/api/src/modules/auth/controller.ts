import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  login as loginService,
  register as registerService,
  refresh as refreshService,
  changePassword as changePasswordService,
  forgotPassword as forgotPasswordService,
  resetPassword as resetPasswordService,
} from './service.js';
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schema.js';
import { recordAudit } from '../../lib/audit-log.js';
import type { AuthenticatedRequest } from './hooks.js';

export async function login(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<void> {
  const body = loginSchema.parse(request.body);
  const result = await loginService(body);
  if (!result.ok) {
    return reply.status(401).send({ success: false, error: { code: result.code, message: result.message } });
  }
  return reply.send({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    },
  });
}

export async function register(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<void> {
  const body = registerSchema.parse(request.body);
  const result = await registerService(body);
  if (!result.ok) {
    const status = result.code === 'CONFLICT' ? 409 : 400;
    return reply.status(status).send({ success: false, error: { code: result.code, message: result.message } });
  }
  recordAudit({
    request,
    actorUserId: result.user.id,
    action: 'USER_REGISTERED',
    entityType: 'user',
    entityId: result.user.id,
    metadata: { email: result.user.email, role: result.user.role },
  });
  return reply.send({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    },
  });
}

export async function refresh(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<void> {
  const body = refreshSchema.parse(request.body);
  const result = await refreshService(body.refreshToken);
  if (!result.ok) {
    return reply.status(401).send({ success: false, error: { code: result.code, message: result.message } });
  }
  return reply.send({
    success: true,
    data: { accessToken: result.accessToken, refreshToken: result.refreshToken },
  });
}

export async function changePassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const body = changePasswordSchema.parse(request.body);
  const result = await changePasswordService(user.sub, body);
  if (!result.ok) {
    const status = result.code === 'INVALID_PASSWORD' ? 400 : 401;
    return reply.status(status).send({ success: false, error: { code: result.code, message: result.message } });
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'USER_PASSWORD_CHANGED',
    entityType: 'user',
    entityId: user.sub,
    metadata: {},
  });
  return reply.send({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    },
  });
}

export async function forgotPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = forgotPasswordSchema.parse(request.body);
  const result = await forgotPasswordService(body);
  if (!result.ok) {
    return reply.status(400).send({ success: false, error: { code: result.code, message: result.message } });
  }
  return reply.send({ success: true, data: { ok: true } });
}

export async function resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = resetPasswordSchema.parse(request.body);
  const result = await resetPasswordService(body);
  if (!result.ok) {
    return reply.status(400).send({ success: false, error: { code: result.code, message: result.message } });
  }
  return reply.send({ success: true, data: { ok: true } });
}
