import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAuthStore } from '@/stores/auth-store';
import { fetchProject, fetchReportsTime, downloadTimeReportCsv } from '@/lib/api';

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  fontSize: 12,
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function secondsToHours(sec: number): number {
  return Math.round((sec / 3600) * 10) / 10;
}

function labelHours(sec: number): string {
  const h = sec / 3600;
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`;
}

export function ProjectReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const defaultTo = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 29);
    return d;
  }, []);

  const [from, setFrom] = useState(() => ymd(defaultFrom));
  const [to, setTo] = useState(() => ymd(defaultTo));
  const [exporting, setExporting] = useState(false);

  const { data: projectRes } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId && isAdmin,
  });

  const { data: timeRes, isLoading } = useQuery({
    queryKey: ['reports', 'time', projectId, from, to],
    queryFn: () => fetchReportsTime({ from, to, projectId }),
    enabled: !!projectId && isAdmin && !!from && !!to,
  });

  if (!isAdmin) return <Navigate to="/projects" replace />;
  if (!projectId) return <Navigate to="/projects" replace />;

  const project = projectRes?.success ? projectRes.data : null;
  const payload = timeRes?.success ? timeRes.data : null;
  const days = payload?.days ?? [];
  const rows = payload?.rows ?? [];

  const billableSec = rows.filter((r) => r.billable).reduce((s, r) => s + r.seconds, 0);
  const nonBillSec = rows.filter((r) => !r.billable).reduce((s, r) => s + r.seconds, 0);
  const totalSec = billableSec + nonBillSec;

  const chartData = days.map((d) => ({
    date: d.date.slice(5),
    Billable: secondsToHours(d.billableSeconds),
    'Non-billable': secondsToHours(d.nonBillableSeconds),
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {project?.title ?? 'Project'}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Time reports</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Billable vs non-billable time for this project. Dates are interpreted in UTC (YYYY-MM-DD).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-5 shadow-card">
        <div>
          <label htmlFor="rep-from" className="block text-xs font-semibold text-foreground-muted">
            From
          </label>
          <input
            id="rep-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input-field mt-1.5 !w-auto !py-2"
          />
        </div>
        <div>
          <label htmlFor="rep-to" className="block text-xs font-semibold text-foreground-muted">
            To
          </label>
          <input
            id="rep-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input-field mt-1.5 !w-auto !py-2"
          />
        </div>
        <button
          type="button"
          disabled={exporting || !from || !to}
          onClick={async () => {
            setExporting(true);
            try {
              await downloadTimeReportCsv({ from, to, projectId });
            } finally {
              setExporting(false);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <p className="text-xs font-semibold text-foreground-muted">Total time</p>
          <p className="mt-1 text-xl font-bold text-foreground">{labelHours(totalSec)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <p className="text-xs font-semibold text-foreground-muted">Billable</p>
          <p className="mt-1 text-xl font-bold text-primary">{labelHours(billableSec)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <p className="text-xs font-semibold text-foreground-muted">Non-billable</p>
          <p className="mt-1 text-xl font-bold text-foreground">{labelHours(nonBillSec)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Hours by day</h2>
        {isLoading ? (
          <p className="text-sm text-foreground-muted">Loading…</p>
        ) : chartData.every((d) => d.Billable === 0 && d['Non-billable'] === 0) ? (
          <p className="text-sm text-foreground-muted">No time logged in this range.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="Billable" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Non-billable" stackId="a" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <h2 className="border-b border-border bg-muted/40 px-5 py-3 text-sm font-semibold text-foreground">
          Entries ({rows.length})
        </h2>
        <div className="max-h-80 overflow-auto">
          {rows.length === 0 ? (
            <p className="p-5 text-sm text-foreground-muted">No entries in this range.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-border bg-muted/60 backdrop-blur-sm">
                <tr className="text-foreground-muted">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.date}-${i}`} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-foreground-muted">{r.date}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-foreground">
                      {r.description || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">
                      {labelHours(r.seconds)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground-muted">
                      {r.billable ? 'Billable' : 'Non-billable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
