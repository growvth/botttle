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

  if (!isAdmin) {
    return <Navigate to="/projects" replace />;
  }

  if (!projectId) {
    return <Navigate to="/projects" replace />;
  }

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
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {project?.title ?? 'Project'}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Time reports</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Billable vs non-billable time for this project. Dates are interpreted in UTC (YYYY-MM-DD).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-4">
        <div>
          <label htmlFor="rep-from" className="block text-xs font-medium text-foreground-muted">
            From
          </label>
          <input
            id="rep-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </div>
        <div>
          <label htmlFor="rep-to" className="block text-xs font-medium text-foreground-muted">
            To
          </label>
          <input
            id="rep-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
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
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-foreground-muted">Total time</p>
          <p className="text-lg font-semibold text-foreground">{labelHours(totalSec)}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-foreground-muted">Billable</p>
          <p className="text-lg font-semibold text-primary">{labelHours(billableSec)}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-foreground-muted">Non-billable</p>
          <p className="text-lg font-semibold text-foreground">{labelHours(nonBillSec)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <h2 className="mb-2 text-sm font-medium text-foreground">Hours by day</h2>
        {isLoading ? (
          <p className="text-sm text-foreground-muted">Loading…</p>
        ) : chartData.every((d) => d.Billable === 0 && d['Non-billable'] === 0) ? (
          <p className="text-sm text-foreground-muted">No time logged in this range.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-foreground-muted" />
                <YAxis tick={{ fontSize: 11 }} className="fill-foreground-muted" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar dataKey="Billable" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Non-billable" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <h2 className="border-b border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground">
          Entries ({rows.length})
        </h2>
        <div className="max-h-80 overflow-auto">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-foreground-muted">No entries in this range.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="border-b border-border text-foreground-muted">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium text-right">Duration</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.date}-${i}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 text-foreground-muted">{r.date}</td>
                    <td className="max-w-[200px] truncate px-3 py-1.5 text-foreground">
                      {r.description || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-foreground">
                      {labelHours(r.seconds)}
                    </td>
                    <td className="px-3 py-1.5 text-foreground-muted">
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
