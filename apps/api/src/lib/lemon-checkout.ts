/**
 * Create a Lemon Squeezy checkout session (server-side).
 * Docs: https://docs.lemonsqueezy.com/api/checkouts#create-a-checkout
 */
export async function createLemonCheckoutUrl(opts: {
  variantId: string;
  invoiceId: string;
  /** Pre-fill checkout email when possible */
  customerEmail?: string | null;
}): Promise<string | null> {
  const apiKey = process.env['LEMONSQUEEZY_API_KEY']?.trim();
  if (!apiKey) return null;

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            ...(opts.customerEmail ? { email: opts.customerEmail } : {}),
            custom: { invoice_id: opts.invoiceId },
          },
        },
        relationships: {
          variant: {
            data: { type: 'variants', id: opts.variantId },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    return null;
  }

  const json = (await res.json()) as {
    data?: { attributes?: { url?: string } };
  };
  const url = json.data?.attributes?.url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}
