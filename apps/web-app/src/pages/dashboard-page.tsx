import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderKanban, FileText, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { fetchProjects, fetchInvoices, fetchClients } from '@/lib/api';
import { cn } from '@botttle/ui';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

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

  const projects = projectsRes?.success ? projectsRes.data : [];
  const invoices = invoicesRes?.success ? invoicesRes.data : [];
  const clients = clientsRes?.success ? clientsRes.data : [];

  const draftInvoices = invoices.filter((i) => i.status === 'DRAFT');
  const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');
  const recentProjects = projects.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);

  const loading = loadingProjects || loadingInvoices || (isAdmin && loadingClients);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-foreground-muted">
          Welcome back{user?.name ? `, ${user.name}` : user?.email ? `, ${user.email}` : ''}.
        </p>
      </div>

      {loading ? (
        <p className="text-foreground-muted">Loading…</p>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-medium text-foreground-muted">Overview</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                to="/projects"
                className="flex items-center gap-4 rounded-lg border border-border bg-background p-4 shadow-subtle transition-colors hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-pale text-primary">
                  <FolderKanban className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{projects.length}</p>
                  <p className="text-sm text-foreground-muted">Projects</p>
                </div>
              </Link>
              <Link
                to="/invoices"
                className="flex items-center gap-4 rounded-lg border border-border bg-background p-4 shadow-subtle transition-colors hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-pale text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{invoices.length}</p>
                  <p className="text-sm text-foreground-muted">Invoices</p>
                </div>
              </Link>
              {isAdmin && (
                <Link
                  to="/clients"
                  className="flex items-center gap-4 rounded-lg border border-border bg-background p-4 shadow-subtle transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-pale text-primary">
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{clients.length}</p>
                    <p className="text-sm text-foreground-muted">Clients</p>
                  </div>
                </Link>
              )}
            </div>
          </section>

          {(draftInvoices.length > 0 || overdueInvoices.length > 0) && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-foreground-muted">Attention</h2>
              <div className="rounded-lg border border-border bg-background p-4 shadow-subtle">
                {draftInvoices.length > 0 && (
                  <p className="text-sm text-foreground">
                    <Link to="/invoices" className="text-primary hover:underline">
                      {draftInvoices.length} draft invoice{draftInvoices.length !== 1 ? 's' : ''}
                    </Link>
                  </p>
                )}
                {overdueInvoices.length > 0 && (
                  <p className={cn('text-sm text-foreground', draftInvoices.length > 0 && 'mt-1')}>
                    <Link to="/invoices" className="text-destructive hover:underline">
                      {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''}
                    </Link>
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-background shadow-subtle">
              <div className="border-b border-border px-4 py-2">
                <h2 className="text-sm font-medium text-foreground">Recent projects</h2>
              </div>
              <div className="p-4">
                {recentProjects.length === 0 ? (
                  <p className="text-sm text-foreground-muted">No projects yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {recentProjects.map((p) => (
                      <li key={p.id}>
                        <Link
                          to={`/projects/${p.id}`}
                          className="text-sm text-foreground hover:text-primary hover:underline"
                        >
                          {p.title}
                        </Link>
                        {p.client && (
                          <span className="ml-2 text-xs text-foreground-muted">
                            — {p.client.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/projects"
                  className="mt-3 inline-block text-sm text-primary hover:underline"
                >
                  View all projects →
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background shadow-subtle">
              <div className="border-b border-border px-4 py-2">
                <h2 className="text-sm font-medium text-foreground">Recent invoices</h2>
              </div>
              <div className="p-4">
                {recentInvoices.length === 0 ? (
                  <p className="text-sm text-foreground-muted">No invoices yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {recentInvoices.map((inv) => (
                      <li key={inv.id}>
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="text-sm text-foreground hover:text-primary hover:underline"
                        >
                          {inv.number}
                        </Link>
                        <span
                          className={cn(
                            'ml-2 rounded px-1.5 py-0.5 text-xs font-medium',
                            inv.status === 'PAID' && 'bg-success-muted text-success',
                            inv.status === 'DRAFT' && 'bg-muted text-foreground-muted',
                            inv.status === 'OVERDUE' && 'bg-destructive/10 text-destructive',
                            inv.status === 'SENT' && 'bg-primary-pale text-primary',
                            inv.status === 'PARTIAL' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          )}
                        >
                          {inv.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/invoices"
                  className="mt-3 inline-block text-sm text-primary hover:underline"
                >
                  View all invoices →
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
