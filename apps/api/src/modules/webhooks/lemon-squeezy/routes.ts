import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@botttle/db';
import { invoiceService } from '../../invoices/service.js';

function verifySignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    const sig = signatureHeader.trim().toLowerCase();
    const exp = expected.toLowerCase();
    if (sig.length !== exp.length) return false;
    return timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(exp, 'utf8'));
  } catch {
    return false;
  }
}

type LemonMeta = {
  event_name?: string;
  custom_data?: Record<string, unknown>;
};

type LemonOrderPayload = {
  meta?: LemonMeta;
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      status?: string;
      total?: number;
      currency?: string;
    };
  };
};

export async function lemonSqueezyWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  app.post('/', async (request, reply) => {
    const secret = process.env['LEMONSQUEEZY_WEBHOOK_SECRET'];
    if (!secret) {
      return reply.status(503).send({ success: false, error: 'Webhooks not configured' });
    }

    const raw = request.body as Buffer;
    if (!Buffer.isBuffer(raw)) {
      return reply.status(400).send({ success: false, error: 'Invalid body' });
    }

    const sig = request.headers['x-signature'] as string | undefined;
    if (!verifySignature(raw, sig, secret)) {
      return reply.status(401).send({ success: false, error: 'Invalid signature' });
    }

    let payload: LemonOrderPayload;
    try {
      payload = JSON.parse(raw.toString('utf8')) as LemonOrderPayload;
    } catch {
      return reply.status(400).send({ success: false, error: 'Invalid JSON' });
    }

    const eventName = payload.meta?.event_name ?? '';
    const attrs = payload.data?.attributes;
    const orderId = payload.data?.id;

    if (eventName === 'order_created' && attrs?.status === 'paid' && orderId) {
      const invoiceIdRaw = payload.meta?.custom_data?.['invoice_id'];
      const invoiceId = typeof invoiceIdRaw === 'string' ? invoiceIdRaw : null;
      if (invoiceId) {
        const externalId = `lemon:${orderId}`;
        const dup = await prisma.payment.findFirst({ where: { externalId } });
        if (!dup) {
          const totalCents = typeof attrs.total === 'number' ? attrs.total : Number(attrs.total);
          const amount = Number.isFinite(totalCents) ? Math.round(totalCents) / 100 : 0;
          if (amount > 0) {
            await invoiceService.addPaymentFromProvider(invoiceId, {
              amount,
              externalId,
              paidAt: new Date(),
            });
          }
        }
      }
    }

    return reply.send({ received: true });
  });
}
