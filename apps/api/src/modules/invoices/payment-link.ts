import { prisma } from '@botttle/db';
import { createLemonCheckoutUrl } from '../../lib/lemon-checkout.js';
import { invoiceRepository } from './repository.js';

function buildTemplateLink(
  template: string,
  invoice: { id: string; currency: string },
  balanceDue: number
): string {
  return template
    .replaceAll('{invoiceId}', invoice.id)
    .replaceAll('{amount}', String(balanceDue))
    .replaceAll('{amountCents}', String(Math.round(balanceDue * 100)))
    .replaceAll('{currency}', invoice.currency);
}

type InvoiceWithProject = NonNullable<Awaited<ReturnType<typeof invoiceRepository.findById>>>;

/**
 * Resolves checkout URL for clients: saved payment_url → env template → Lemon API (caches URL on success).
 */
export async function resolveClientPaymentLink(
  invoice: InvoiceWithProject,
  balanceDue: number
): Promise<{ paymentLink: string | null; invoice: InvoiceWithProject }> {
  if (balanceDue <= 0) {
    return { paymentLink: null, invoice };
  }

  const saved = invoice.paymentUrl?.trim();
  if (saved) {
    return { paymentLink: saved, invoice };
  }

  const template = process.env['INVOICE_PAYMENT_LINK_TEMPLATE']?.trim();
  if (template) {
    return { paymentLink: buildTemplateLink(template, invoice, balanceDue), invoice };
  }

  const variantId =
    invoice.lemonVariantId?.trim() || process.env['LEMONSQUEEZY_DEFAULT_VARIANT_ID']?.trim();
  if (!variantId) {
    return { paymentLink: null, invoice };
  }

  const clientEmail = invoice.project?.client?.email ?? null;
  const url = await createLemonCheckoutUrl({
    variantId,
    invoiceId: invoice.id,
    customerEmail: clientEmail,
  });
  if (!url) {
    return { paymentLink: null, invoice };
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { paymentUrl: url },
  });
  const fresh = await invoiceRepository.findById(invoice.id);
  return { paymentLink: url, invoice: fresh ?? invoice };
}
