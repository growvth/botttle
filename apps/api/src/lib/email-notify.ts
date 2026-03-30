import { enqueueEmail } from '../queue/email-queue.js';
import { clientUserEmailsForClientId, collaboratorEmails } from './project-recipient-emails.js';

function publicAppUrl(): string {
  return (process.env['APP_PUBLIC_URL'] ?? 'http://localhost:5173').replace(/\/$/, '');
}

export async function notifyCollaboratorsByEmail(opts: {
  projectId: string;
  exceptUserId: string;
  subject: string;
  textBody: string;
  path: string;
}): Promise<void> {
  const recipients = await collaboratorEmails(opts.projectId, opts.exceptUserId);
  if (recipients.length === 0) return;

  const link = `${publicAppUrl()}${opts.path.startsWith('/') ? opts.path : `/${opts.path}`}`;
  const html = `<p>${escapeHtml(opts.textBody)}</p><p><a href="${escapeHtml(link)}">Open in botttle</a></p>`;

  for (const r of recipients) {
    await enqueueEmail({
      to: [r.email],
      subject: opts.subject,
      html,
      text: `${opts.textBody}\n\n${link}`,
    });
  }
}

export async function notifyInvoiceSentEmails(opts: {
  clientId: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  invoiceId: string;
}): Promise<void> {
  const recipients = await clientUserEmailsForClientId(opts.clientId);
  if (recipients.length === 0) return;

  const link = `${publicAppUrl()}/invoices/${opts.invoiceId}`;
  const subject = `Invoice ${opts.invoiceNumber} is ready`;
  const textBody = `You have a new invoice ${opts.invoiceNumber} for ${opts.total} ${opts.currency}.`;
  const html = `<p>${escapeHtml(textBody)}</p><p><a href="${escapeHtml(link)}">View invoice</a></p>`;

  for (const r of recipients) {
    await enqueueEmail({
      to: [r.email],
      subject,
      html,
      text: `${textBody}\n\n${link}`,
    });
  }
}

export async function notifyPasswordResetEmail(opts: {
  email: string;
  token: string;
}): Promise<void> {
  const link = `${publicAppUrl()}/reset-password?token=${encodeURIComponent(opts.token)}`;
  const subject = `Reset your botttle password`;
  const textBody = `A password reset was requested for your account. If this was you, use the link below to set a new password. If you didn't request this, you can ignore this email.\n\nThis link will expire soon.`;
  const html = `<p>${escapeHtml(
    "A password reset was requested for your account. If this was you, use the link below to set a new password. If you didn't request this, you can ignore this email."
  )}</p><p><a href="${escapeHtml(link)}">Reset password</a></p><p>${escapeHtml(
    'This link will expire soon.'
  )}</p>`;

  await enqueueEmail({
    to: [opts.email],
    subject,
    html,
    text: `${textBody}\n\n${link}`,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
