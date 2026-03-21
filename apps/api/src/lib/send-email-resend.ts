export type SendEmailPayload = {
  to: string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmailViaResend(payload: SendEmailPayload): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env['RESEND_API_KEY']?.trim();
  const from = process.env['EMAIL_FROM']?.trim();
  if (!apiKey || !from) {
    return { ok: false, error: 'Email not configured (RESEND_API_KEY / EMAIL_FROM)' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.text ? { text: payload.text } : {}),
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: t.slice(0, 500) };
  }
  return { ok: true };
}
