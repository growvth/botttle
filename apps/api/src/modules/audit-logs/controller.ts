import type { FastifyRequest, FastifyReply } from 'fastify';
import { auditLogService } from './service.js';
import { listAuditLogsQuerySchema } from './schema.js';
import { success } from '../../lib/response.js';

export async function listAuditLogs(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const q = listAuditLogsQuerySchema.parse(request.query);
  const data = await auditLogService.list(q);
  return reply.send(success(data));
}
