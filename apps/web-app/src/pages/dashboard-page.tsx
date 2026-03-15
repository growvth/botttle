import { useAuthStore } from '@/stores/auth-store';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-foreground-muted">
          Welcome back{user?.name ? `, ${user.name}` : ''}.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-background p-6 shadow-subtle">
        <h2 className="text-lg font-medium text-foreground">Getting started</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Your client portal is ready. Projects, invoices, and time tracking will appear here as you add them.
        </p>
      </div>
    </div>
  );
}
