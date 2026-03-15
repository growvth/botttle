import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  fetchInvoice,
  updateInvoiceStatus,
  addPayment,
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

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'COMPLETED'>('COMPLETED');

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

  const invoice = res?.success ? res.data : null;

  if (!id || (res && !res.success)) {
    return (
      <div className="text-foreground-muted">
        Invoice not found.{' '}
        <Link to="/invoices" className="text-primary hover:underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  if (isLoading || !invoice) {
    return <p className="text-foreground-muted">Loading…</p>;
  }

  const totalPaid =
    invoice.payments?.filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0) ??
    0;
  const balance = invoice.total - totalPaid;

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Invoices
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{invoice.number}</h1>
            <p className="mt-1 text-foreground-muted">
              {invoice.project?.title}
              {invoice.project?.client && ` · ${invoice.project.client.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded px-2 py-1 text-sm font-medium',
                STATUS_STYLE[invoice.status] ?? 'bg-muted text-foreground-muted'
              )}
            >
              {invoice.status}
            </span>
            {isAdmin && totalPaid < invoice.total && (
              <select
                value={invoice.status}
                onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                disabled={updateStatusMutation.isPending}
                className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-4">
          <h2 className="text-sm font-medium text-foreground-muted">Details</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Due date</dt>
              <dd className="text-foreground">{formatDate(invoice.dueDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Subtotal</dt>
              <dd className="text-foreground">{formatMoney(invoice.subtotal, invoice.currency)}</dd>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex justify-between">
                <dt className="text-foreground-muted">Tax ({invoice.taxRate}%)</dt>
                <dd className="text-foreground">
                  {formatMoney((invoice.subtotal * invoice.taxRate) / 100, invoice.currency)}
                </dd>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <dt className="text-foreground-muted">Total</dt>
              <dd className="text-foreground">{formatMoney(invoice.total, invoice.currency)}</dd>
            </div>
            {totalPaid > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-foreground-muted">Paid</dt>
                  <dd className="text-foreground">{formatMoney(totalPaid, invoice.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground-muted">Balance</dt>
                  <dd className="text-foreground">{formatMoney(balance, invoice.currency)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {invoice.payments && invoice.payments.length > 0 && (
          <div className="rounded-lg border border-border bg-background p-4">
            <h2 className="text-sm font-medium text-foreground-muted">Payments</h2>
            <ul className="mt-2 space-y-2">
              {invoice.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-foreground">{formatMoney(p.amount, invoice.currency)}</span>
                  <span className={cn('rounded px-1.5 py-0.5 text-xs', p.status === 'COMPLETED' ? 'bg-success-muted text-success' : 'bg-muted text-foreground-muted')}>
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

      {isAdmin && balance > 0 && (
        <div className="rounded-lg border border-border bg-background p-4">
          <h2 className="text-sm font-medium text-foreground-muted">Record payment</h2>
          {!showPayment ? (
            <button
              type="button"
              onClick={() => setShowPayment(true)}
              className="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Add payment
            </button>
          ) : (
            <form
              className="mt-2 flex flex-wrap items-end gap-2"
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
                  className="w-28 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
              </div>
              <div>
                <label htmlFor="pay-status" className="sr-only">Status</label>
                <select
                  id="pay-status"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as 'PENDING' | 'COMPLETED')}
                  className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                >
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={addPaymentMutation.isPending || !paymentAmount}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setShowPayment(false); setPaymentAmount(''); }}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <h2 className="border-b border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground">
          Line items
        </h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-foreground-muted">
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium text-right">Qty</th>
              <th className="px-4 py-2 font-medium text-right">Unit price</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-foreground">{item.description}</td>
                <td className="px-4 py-2 text-right text-foreground">{item.quantity}</td>
                <td className="px-4 py-2 text-right text-foreground">
                  {formatMoney(item.unitPrice, invoice.currency)}
                </td>
                <td className="px-4 py-2 text-right text-foreground">
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
