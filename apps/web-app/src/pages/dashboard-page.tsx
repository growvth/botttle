import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderKanban, FileText, Users, MessageSquare, Paperclip, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { useAuthStore } from '@/stores/auth-store';
import { fetchProjects, fetchInvoices, fetchClients, fetchReportsSummary, fetchReportsTime } from '@/lib/api';
import { cn } from '@botttle/ui';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#64748b'];

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

function secondsToHours(sec: number): string {
  if (sec <= 0) return '0h';
  const h = sec / 3600;
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 13);
  const fromStr = ymd(from);
  const toStr = ymd(to);

  const { data: projectsRes, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
  });
  const { data: invoicesRes, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetchInvoices(),
  });
  const { data: clientsRes, isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => fetchClients(),
    enabled: isAdmin,
  });
  const { data: summaryRes } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => fetchReportsSummary(),
  });
  const { data: timeRes } = useQuery({
    queryKey: ['reports', 'time', fromStr, toStr],
    queryFn: () => fetchReportsTime({ from: fromStr, to: toStr }),
  });

  const projects = projectsRes?.success ? projectsRes.data : [];
  const invoices = invoicesRes?.success ? invoicesRes.data : [];
  const clients = clientsRes?.success ? clientsRes.data : [];
  const summary = summaryRes?.success ? summaryRes.data : null;
  const timeDays = timeRes?.success ? timeRes.data.days : [];

  const draftInvoices = invoices.filter((i) => i.status === 'DRAFT');
  const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');
  const recentProjects = projects.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);

  const projectChartData =
    summary?.projectCountByStatus.map((r) => ({
      name: r.status.replace(/_/g, ' '),
      count: r.count,
    })) ?? [];

  const invoiceChartData =
    summary?.invoiceCountByStatus.map((r) => ({
      name: r.status.replace(/_/g, ' '),
      count: r.count,
    })) ?? [];

  const timeSplitData =
    summary && summary.timeSeconds.total > 0
      ? [
          { name: 'Billable', value: summary.timeSeconds.billable, key: 'billable' },
          { name: 'Non-billable', value: summary.timeSeconds.nonBillable, key: 'non' },
        ]
      : [];

  const timeTrendData = timeDays.map((d) => ({
    date: d.date.slice(5),
    Billable: Math.round((d.billableSeconds / 3600) * 10) / 10,
    NonBillable: Math.round((d.nonBillableSeconds / 3600) * 10) / 10,
  }));

  const taskTotal = summary?.tasks.total ?? 0;
  const taskDone = summary?.tasks.completed ?? 0;
  const taskPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Welcome back{user?.name ? `, ${user.name}` : user?.email ? `, ${user.email}` : ''}.
        </p>
      </div>

      {/* ── Overview cards ── */}
      <section>
        <h2 className="section-title mb-3">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/projects"
            className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <FolderKanban className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {loadingProjects ? '…' : projects.length}
              </p>
              <p className="text-sm text-foreground-muted">Projects</p>
            </div>
          </Link>
          <Link
            to="/invoices"
            className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-500/15 dark:text-emerald-400">
              <FileText className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {loadingInvoices ? '…' : invoices.length}
              </p>
              <p className="text-sm text-foreground-muted">Invoices</p>
            </div>
          </Link>
          {isAdmin && (
            <Link
              to="/clients"
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 transition-colors group-hover:bg-violet-500/15 dark:text-violet-400">
                <Users className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loadingClients ? '…' : clients.length}
                </p>
                <p className="text-sm text-foreground-muted">Clients</p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ── Insights ── */}
      {summary && (
        <section>
          <h2 className="section-title mb-3">Insights</h2>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface px-5 py-4 shadow-card">
              <div className="flex items-center gap-2 text-foreground-muted">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                <p className="text-xs font-medium">Recorded time</p>
              </div>
              <p className="mt-1 text-xl font-bold text-foreground">{secondsToHours(summary.timeSeconds.total)}</p>
              <p className="mt-0.5 text-xs text-foreground-muted">
                {secondsToHours(summary.timeSeconds.billable)} billable · {secondsToHours(summary.timeSeconds.nonBillable)} non-billable
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-5 py-4 shadow-card">
              <div className="flex items-center gap-2 text-foreground-muted">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                <p className="text-xs font-medium">Revenue</p>
              </div>
              <p className="mt-1 text-xl font-bold text-foreground">
                {summary.totalRevenue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
              </p>
              <p className="mt-0.5 text-xs text-foreground-muted">Completed payments</p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-5 py-4 shadow-card">
              <div className="flex items-center gap-2 text-foreground-muted">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                <p className="text-xs font-medium">Tasks completed</p>
              </div>
              <p className="mt-1 text-xl font-bold text-foreground">
                {taskDone} <span className="text-sm font-normal text-foreground-muted">/ {taskTotal}</span>
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${taskPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Charts grid ── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Projects by status</h3>
              {projectChartData.length === 0 ? (
                <p className="text-sm text-foreground-muted">No project data yet.</p>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Projects" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Invoices by status</h3>
              {invoiceChartData.length === 0 ? (
                <p className="text-sm text-foreground-muted">No invoice data yet.</p>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={invoiceChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} name="Invoices" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Time: billable split</h3>
              {timeSplitData.length === 0 ? (
                <p className="text-sm text-foreground-muted">No time logged yet.</p>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={timeSplitData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {timeSplitData.map((entry, i) => (
                          <Cell key={entry.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => secondsToHours(typeof value === 'number' ? value : 0)}
                        contentStyle={tooltipStyle}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Time trend (14 days, hours)</h3>
              {timeTrendData.every((d) => d.Billable === 0 && d.NonBillable === 0) ? (
                <p className="text-sm text-foreground-muted">No time in this range.</p>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradBillable" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradNonBillable" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Area type="monotone" dataKey="Billable" stackId="1" stroke="#3b82f6" fill="url(#gradBillable)" strokeWidth={2} />
                      <Area type="monotone" dataKey="NonBillable" stackId="1" stroke="#94a3b8" fill="url(#gradNonBillable)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* ── Admin collaboration widgets ── */}
          {isAdmin && (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Client collaboration (30 days)</h3>
                {summary.clientActivity30d && summary.clientActivity30d.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={summary.clientActivity30d.map((r) => ({
                          name: r.clientName.length > 22 ? `${r.clientName.slice(0, 21)}…` : r.clientName,
                          Comments: r.comments,
                          Files: r.files,
                        }))}
                        margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                        <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11, fill: 'var(--color-foreground-muted)' }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar dataKey="Comments" stackId="collab" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Files" stackId="collab" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted">
                    No comments or uploads on client projects in the last 30 days.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Latest activity</h3>
                {summary.collaborationFeed && summary.collaborationFeed.length > 0 ? (
                  <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
                    {summary.collaborationFeed.map((ev, i) => (
                      <li key={`${ev.at}-${ev.projectId}-${i}`} className="text-sm">
                        <div className="flex flex-wrap items-center gap-1.5 text-foreground-muted">
                          {ev.type === 'comment' ? (
                            <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          ) : (
                            <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          )}
                          <span className="text-xs">
                            {new Date(ev.at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-foreground">
                          <span className="font-semibold">{ev.actorLabel}</span>
                          {ev.type === 'comment' ? ' commented on ' : ' uploaded to '}
                          <Link to={`/projects/${ev.projectId}`} className="font-medium text-primary hover:underline">
                            {ev.projectTitle}
                          </Link>
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-foreground-muted">{ev.summary}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-foreground-muted">No recent comments or file uploads yet.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Attention ── */}
      {(draftInvoices.length > 0 || overdueInvoices.length > 0) && (
        <section>
          <h2 className="section-title mb-3">Attention</h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
            {draftInvoices.length > 0 && (
              <p className="text-sm text-foreground">
                <Link to="/invoices" className="font-semibold text-primary hover:underline">
                  {draftInvoices.length} draft invoice{draftInvoices.length !== 1 ? 's' : ''}
                </Link>{' '}
                waiting to be sent.
              </p>
            )}
            {overdueInvoices.length > 0 && (
              <p className={cn('text-sm text-foreground', draftInvoices.length > 0 && 'mt-1.5')}>
                <Link to="/invoices" className="font-semibold text-destructive hover:underline">
                  {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''}
                </Link>{' '}
                need attention.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Recent lists ── */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Recent projects</h2>
          </div>
          <div className="p-5">
            {recentProjects.length === 0 ? (
              <p className="text-sm text-foreground-muted">
                {loadingProjects ? 'Loading projects…' : 'No projects yet.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {recentProjects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <Link
                      to={`/projects/${p.id}`}
                      className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {p.title}
                    </Link>
                    {p.client && (
                      <span className="ml-2 text-xs text-foreground-muted">{p.client.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/projects" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              View all projects →
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Recent invoices</h2>
          </div>
          <div className="p-5">
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-foreground-muted">
                {loadingInvoices ? 'Loading invoices…' : 'No invoices yet.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {recentInvoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {inv.number}
                    </Link>
                    <span
                      className={cn(
                        'badge',
                        inv.status === 'PAID' && 'bg-success-muted text-success',
                        inv.status === 'DRAFT' && 'bg-muted text-foreground-muted',
                        inv.status === 'OVERDUE' && 'bg-destructive/10 text-destructive',
                        inv.status === 'SENT' && 'bg-primary-pale text-primary',
                        inv.status === 'PARTIAL' &&
                          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      )}
                    >
                      {inv.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/invoices" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              View all invoices →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
