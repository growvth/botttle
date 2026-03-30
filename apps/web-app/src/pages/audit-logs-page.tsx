import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, X } from 'lucide-react';
import { fetchAuditLogs } from '@/lib/api';
import { cn } from '@botttle/ui';

const PAGE = 40;

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function shortValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string') return v.length > 32 ? `${v.slice(0, 32)}…` : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === 'object') return '{…}';
  return String(v);
}

function summarize(action: string, entityType: string, meta: unknown): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as Record<string, unknown>;

  if (action === 'INVOICE_STATUS_UPDATED') {
    const from = m['from'];
    const to = m['to'];
    if (typeof from === 'string' && typeof to === 'string') return `Status: ${from} → ${to}`;
  }
  if (action === 'PROJECT_UPDATED') {
    const status = m['status'];
    if (typeof status === 'string') return `Status set to ${status}`;
  }
  if (action === 'USER_UPDATED') {
    const parts: string[] = [];
    if (typeof m['role'] === 'string') parts.push(`role=${m['role']}`);
    if (typeof m['disabled'] === 'boolean') parts.push(`disabled=${m['disabled']}`);
    if (m['clientId'] !== undefined) parts.push(`client=${shortValue(m['clientId'])}`);
    if (typeof m['name'] === 'string') parts.push(`name=${m['name']}`);
    if (parts.length) return `Updated ${parts.join(', ')}`;
  }

  // Generic fallback for small objects.
  const keys = Object.keys(m);
  if (keys.length > 0 && keys.length <= 3) {
    return keys.map((k) => `${k}: ${shortValue(m[k])}`).join(' · ');
  }
  if (keys.length > 0) return `${entityType} updated`;
  return null;
}

export function AuditLogsPage() {
  const [skip, setSkip] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [open, setOpen] = useState<{ title: string; json: string } | null>(null);

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

  const rows = useMemo(() => {
    return items.map((row) => {
      const summary = summarize(row.action, row.entityType, row.metadata);
      const json = row.metadata != null ? safeJson(row.metadata) : '';
      return { row, summary, json };
    });
  }, [items]);

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
            {rows.map(({ row, summary, json }) => (
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
                <td className="px-4 py-3 text-xs text-foreground-muted">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      {summary ?? (row.metadata != null ? 'View details' : '—')}
                    </span>
                    {row.metadata != null && (
                      <button
                        type="button"
                        onClick={() => setOpen({ title: row.action, json })}
                        className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        View
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setOpen(null)}
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-dropdown">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{open.title}</div>
                <div className="text-xs text-foreground-muted">Raw metadata (JSON)</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(open.json);
                    } catch {
                      // ignore
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-surface p-2 text-foreground transition-colors hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <pre className="max-h-[70vh] overflow-auto bg-muted/30 p-4 text-xs text-foreground">
              <code>{open.json}</code>
            </pre>
          </div>
        </div>
      )}

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
