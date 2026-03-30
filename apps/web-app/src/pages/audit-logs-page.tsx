import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAuditLogs } from '@/lib/api';
import { cn } from '@botttle/ui';

const PAGE = 40;

export function AuditLogsPage() {
  const [skip, setSkip] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', skip, actionFilter, entityFilter],
    queryFn: async () => {
      const res = await fetchAuditLogs({
        take: PAGE,
        skip,
        action: actionFilter.trim() || undefined,
        entityType: entityFilter.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasPrev = skip > 0;
  const hasNext = skip + items.length < total;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Recent changes from the API (mutations only). Filter by action or entity type.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-foreground-muted">
          Action contains
          <input
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setSkip(0);
            }}
            placeholder="e.g. INVOICE_"
            className="input-field w-48 !py-2 !text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-foreground-muted">
          Entity type
          <input
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setSkip(0);
            }}
            placeholder="e.g. invoice"
            className="input-field w-40 !py-2 !text-sm"
          />
        </label>
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error instanceof Error ? error.message : 'Could not load audit log.'}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">When</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Action</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Entity</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Actor</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">IP</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-foreground-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-foreground-muted">
                  No entries match.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-foreground-muted">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{row.action}</td>
                <td className="px-4 py-3 text-xs">
                  <span className="text-foreground-muted">{row.entityType}</span>
                  <code className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-foreground">{row.entityId}</code>
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 text-xs text-foreground">
                  {row.actor ? row.actor.name || row.actor.email : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-foreground-muted">
                  {row.ipAddress ?? '—'}
                </td>
                <td className="max-w-xs truncate px-4 py-3 font-mono text-[11px] text-foreground-muted">
                  {row.metadata != null ? JSON.stringify(row.metadata) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-foreground-muted">
          Showing {total === 0 ? 0 : skip + 1}–{Math.min(skip + items.length, total)} of {total}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => setSkip((s) => Math.max(0, s - PAGE))}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
              !hasPrev && 'pointer-events-none opacity-40'
            )}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => setSkip((s) => s + PAGE)}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
              !hasNext && 'pointer-events-none opacity-40'
            )}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
