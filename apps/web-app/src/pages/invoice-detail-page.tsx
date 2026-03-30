import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileDown, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  fetchInvoice,
  updateInvoiceStatus,
  addPayment,
  downloadInvoicePdf,
  updateInvoicePaymentSettings,
  createInvoiceLemonCheckout,
  type Invoice,
} from '@/lib/api';
import { cn } from '@botttle/ui';

const STATUS_OPTIONS = ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE'] as const;
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground-muted',
  SENT: 'bg-primary-pale text-primary',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PAID: 'bg-success-muted text-success',
  OVERDUE: 'bg-destructive/10 text-destructive',
};

const CLIENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Awaiting payment',
  PARTIAL: 'Partially paid',
  PAID: 'Paid in full',
  OVERDUE: 'Past due',
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
}

function invoiceTotals(inv: Invoice) {
  const paid =
    inv.totalPaid ??
    (inv.payments?.filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0) ?? 0);
  const balance =
    inv.balanceDue !== undefined ? inv.balanceDue : Math.round((inv.total - paid) * 100) / 100;
  return { totalPaid: paid, balance };
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'COMPLETED'>('COMPLETED');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [paymentUrlDraft, setPaymentUrlDraft] = useState('');
  const [lemonVariantDraft, setLemonVariantDraft] = useState('');
  const [paymentSettingsError, setPaymentSettingsError] = useState<string | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => fetchInvoice(id!),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => updateInvoiceStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: (body: { amount: number; status: string; paidAt?: string }) =>
      addPayment(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setShowPayment(false);
      setPaymentAmount('');
    },
  });

  const savePaymentSettingsMutation = useMutation({
    mutationFn: () =>
      updateInvoicePaymentSettings(id!, {
        paymentUrl: paymentUrlDraft.trim() || '',
        lemonVariantId: lemonVariantDraft.trim() || '',
      }),
    onSuccess: (r) => {
      setPaymentSettingsError(null);
      if (r.success) {
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      } else {
        setPaymentSettingsError(r.error.message);
      }
    },
    onError: (e: Error) => setPaymentSettingsError(e.message),
  });

  const lemonCheckoutMutation = useMutation({
    mutationFn: () => createInvoiceLemonCheckout(id!),
    onSuccess: (r) => {
      setPaymentSettingsError(null);
      if (r.success) {
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      } else {
        setPaymentSettingsError(r.error.message);
      }
    },
    onError: (e: Error) => setPaymentSettingsError(e.message),
  });

  const invoice = res?.success ? res.data : null;

  useEffect(() => {
    if (!invoice) return;
    setPaymentUrlDraft(invoice.paymentUrl ?? '');
    setLemonVariantDraft(invoice.lemonVariantId ?? '');
  }, [invoice?.id, invoice?.paymentUrl, invoice?.lemonVariantId]);

  if (!id || (res && !res.success)) {
    return (
      <div className="text-foreground-muted">
        Invoice not found.{' '}
        <Link to="/invoices" className="font-medium text-primary hover:underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  if (isLoading || !invoice) {
    return <p className="text-foreground-muted">Loading…</p>;
  }

  const { totalPaid, balance } = invoiceTotals(invoice);

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Invoices
        </Link>

        {!isAdmin ? (
          <div className="mt-4 space-y-5">
            <div>
              <p className="text-sm text-foreground-muted">Invoice</p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{invoice.number}</h1>
              <p className="mt-1 text-foreground-muted">
                {invoice.project?.title}
                {invoice.project?.client && ` · ${invoice.project.client.name}`}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary-pale/40 to-surface p-7 shadow-card dark:from-primary/10">
              <p className="text-sm font-semibold text-foreground-muted">
                {balance <= 0 ? 'Status' : 'Amount due'}
              </p>
              {balance > 0 ? (
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {formatMoney(balance, invoice.currency)}
                </p>
              ) : (
                <p className="mt-1 text-xl font-semibold text-success">
                  {CLIENT_STATUS_LABEL[invoice.status] ?? invoice.status}
                </p>
              )}
              <p className="mt-2 text-sm text-foreground-muted">
                Due {formatDate(invoice.dueDate)} · {CLIENT_STATUS_LABEL[invoice.status] ?? invoice.status}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {invoice.paymentLink && balance > 0 && (
                  <a
                    href={invoice.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:bg-primary-hover active:scale-[0.98]"
                  >
                    Pay online
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setDownloadingPdf(true);
                    await downloadInvoicePdf(invoice.id, `invoice-${invoice.number}.pdf`);
                    setDownloadingPdf(false);
                  }}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                  {downloadingPdf ? 'Downloading…' : 'Download PDF'}
                </button>
                {invoice.project?.id && (
                  <Link
                    to={`/projects/${invoice.project.id}`}
                    className="inline-flex items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    View project
                  </Link>
                )}
              </div>
              {!invoice.paymentLink && balance > 0 && (
                <p className="mt-4 text-xs text-foreground-muted">
                  Your freelancer will share payment instructions if online checkout is not enabled.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{invoice.number}</h1>
              <p className="mt-1 text-foreground-muted">
                {invoice.project?.title}
                {invoice.project?.client && ` · ${invoice.project.client.name}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('badge', STATUS_STYLE[invoice.status] ?? 'bg-muted text-foreground-muted')}>
                {invoice.status}
              </span>
              {totalPaid < invoice.total && (
                <select
                  value={invoice.status}
                  onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                  disabled={updateStatusMutation.isPending}
                  className="input-field !w-auto !py-1.5 !text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={async () => {
                  setDownloadingPdf(true);
                  await downloadInvoicePdf(invoice.id, `invoice-${invoice.number}.pdf`);
                  setDownloadingPdf(false);
                }}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                {downloadingPdf ? 'Downloading…' : 'PDF'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground-muted">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Due date</dt>
              <dd className="font-medium text-foreground">{formatDate(invoice.dueDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Subtotal</dt>
              <dd className="font-medium text-foreground">{formatMoney(invoice.subtotal, invoice.currency)}</dd>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex justify-between">
                <dt className="text-foreground-muted">Tax ({invoice.taxRate}%)</dt>
                <dd className="font-medium text-foreground">
                  {formatMoney((invoice.subtotal * invoice.taxRate) / 100, invoice.currency)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="font-bold text-foreground">{formatMoney(invoice.total, invoice.currency)}</dd>
            </div>
            {totalPaid > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-foreground-muted">Paid</dt>
                  <dd className="font-medium text-success">{formatMoney(totalPaid, invoice.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground-muted">Balance</dt>
                  <dd className="font-medium text-foreground">{formatMoney(balance, invoice.currency)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {invoice.payments && invoice.payments.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground-muted">Payments</h2>
            <ul className="mt-3 space-y-2.5">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">{formatMoney(p.amount, invoice.currency)}</span>
                  <span
                    className={cn(
                      'badge',
                      p.status === 'COMPLETED'
                        ? 'bg-success-muted text-success'
                        : 'bg-muted text-foreground-muted'
                    )}
                  >
                    {p.status}
                  </span>
                  {p.paidAt && (
                    <span className="text-foreground-muted">{formatDate(p.paidAt)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground-muted">Client checkout</h2>
          <p className="mt-1 text-xs text-foreground-muted">
            Optional payment link stored on this invoice (shown to clients before env template or auto Lemon).
            Use &quot;Create Lemon link&quot; if <code className="rounded bg-muted px-1 py-0.5 text-foreground">LEMONSQUEEZY_API_KEY</code> and a variant id are configured.
          </p>
          {paymentSettingsError && (
            <p className="mt-2 text-sm font-medium text-destructive" role="alert">
              {paymentSettingsError}
            </p>
          )}
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-foreground-muted">
              Payment URL
              <input
                value={paymentUrlDraft}
                onChange={(e) => setPaymentUrlDraft(e.target.value)}
                placeholder="https://…"
                className="input-field mt-1.5 !py-2"
              />
            </label>
            <label className="block text-xs font-medium text-foreground-muted">
              Lemon variant id (optional override)
              <input
                value={lemonVariantDraft}
                onChange={(e) => setLemonVariantDraft(e.target.value)}
                placeholder="Numeric variant id from Lemon"
                className="input-field mt-1.5 !py-2"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={savePaymentSettingsMutation.isPending}
                onClick={() => savePaymentSettingsMutation.mutate()}
                className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
              >
                Save checkout settings
              </button>
              <button
                type="button"
                disabled={lemonCheckoutMutation.isPending}
                onClick={() => lemonCheckoutMutation.mutate()}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {lemonCheckoutMutation.isPending ? 'Creating…' : 'Create Lemon checkout link'}
              </button>
            </div>
            {invoice.paymentUrl && (
              <p className="text-xs text-foreground-muted">
                Current saved URL:{' '}
                <a href={invoice.paymentUrl} className="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
                  open
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {isAdmin && balance > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground-muted">Record payment</h2>
          {!showPayment ? (
            <button
              type="button"
              onClick={() => setShowPayment(true)}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              Add payment
            </button>
          ) : (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const amount = parseFloat(paymentAmount);
                if (Number.isFinite(amount) && amount > 0) {
                  addPaymentMutation.mutate({
                    amount,
                    status: paymentStatus,
                    paidAt: paymentStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
                  });
                }
              }}
            >
              <div>
                <label htmlFor="pay-amount" className="sr-only">Amount</label>
                <input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Amount"
                  className="input-field w-28 !py-2"
                />
              </div>
              <div>
                <label htmlFor="pay-status" className="sr-only">Status</label>
                <select
                  id="pay-status"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as 'PENDING' | 'COMPLETED')}
                  className="input-field !w-auto !py-2"
                >
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={addPaymentMutation.isPending || !paymentAmount}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPayment(false);
                  setPaymentAmount('');
                }}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <h2 className="border-b border-border bg-muted/40 px-5 py-3 text-sm font-semibold text-foreground">
          Line items
        </h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-foreground-muted">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Description</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider">Qty</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider">Unit price</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3.5 text-foreground">{item.description}</td>
                <td className="px-5 py-3.5 text-right text-foreground">{item.quantity}</td>
                <td className="px-5 py-3.5 text-right text-foreground">
                  {formatMoney(item.unitPrice, invoice.currency)}
                </td>
                <td className="px-5 py-3.5 text-right font-medium text-foreground">
                  {formatMoney(item.amount, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
