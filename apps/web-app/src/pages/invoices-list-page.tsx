import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { fetchInvoices, type Invoice } from '@/lib/api';
import { cn } from '@botttle/ui';
import { EmptyState, LoadingState } from '@/components/ui/page-states';

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
  PAID: 'Paid',
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

export function InvoicesListPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const { data: res, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetchInvoices(),
  });

  const invoices = res?.success ? res.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Invoices</h1>
        {isAdmin && (
          <Link
            to="/invoices/new"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            New invoice
          </Link>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Loading invoices…" />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body={isAdmin ? 'Create one from a project or use “New invoice” above.' : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Number</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Project</th>
                {isAdmin && (
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Client</th>
                )}
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Due date</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Total</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: Invoice) => (
                <tr
                  key={inv.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-foreground">
                    {inv.project?.title ?? '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3.5 text-foreground-muted">
                      {inv.project?.client?.name ?? '—'}
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-foreground-muted">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-foreground">
                    {formatMoney(inv.total, inv.currency)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        'badge',
                        STATUS_STYLE[inv.status] ?? 'bg-muted text-foreground-muted'
                      )}
                    >
                      {isAdmin ? inv.status : CLIENT_STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
