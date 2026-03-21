import type { FastifyRequest, FastifyReply } from 'fastify';
import { reportsService } from './service.js';
import { success } from '../../lib/response.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { timeReportQuerySchema, parseYmdUtc } from './schema.js';

export async function getReportsSummary(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const data = await reportsService.summary(user.role, user.sub);
  return reply.send(success(data));
}

export async function getTimeReport(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const q = timeReportQuerySchema.parse(request.query);
  const from = parseYmdUtc(q.from);
  const to = parseYmdUtc(q.to);
  const data = await reportsService.timeReport(user.role, user.sub, {
    from,
    to,
    projectId: q.projectId,
  });
  if (q.format === 'csv') {
    const csv = reportsService.timeReportToCsv(data.rows);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="time-report.csv"')
      .send(csv);
  }
  return reply.send(success(data));
}
