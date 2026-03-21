import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { fetchInvoices, type Invoice } from '@/lib/api';
import { cn } from '@botttle/ui';

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
        <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
        {isAdmin && (
          <Link
            to="/invoices/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-subtle hover:bg-primary-hover"
          >
            New invoice
          </Link>
        )}
      </div>

      {isLoading ? (
        <p className="text-foreground-muted">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <div className="rounded-lg border border-border bg-background p-8 text-center text-foreground-muted">
          No invoices yet.
          {isAdmin && ' Create one from a project or use "New invoice" above.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-medium text-foreground">Number</th>
                <th className="px-4 py-3 font-medium text-foreground">Project</th>
                {isAdmin && (
                  <th className="px-4 py-3 font-medium text-foreground">Client</th>
                )}
                <th className="px-4 py-3 font-medium text-foreground">Due date</th>
                <th className="px-4 py-3 font-medium text-foreground">Total</th>
                <th className="px-4 py-3 font-medium text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: Invoice) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {inv.project?.title ?? '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-foreground-muted">
                      {inv.project?.client?.name ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-foreground-muted">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatMoney(inv.total, inv.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium',
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
