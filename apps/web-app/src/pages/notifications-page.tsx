import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@botttle/ui';
import { Link } from 'react-router-dom';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/api';

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notifications', 'page'],
    queryFn: async () => {
      const res = await fetchNotifications({ limit: 200 });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'page'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'page'] });
    },
  });

  async function onItemClick(n: AppNotification) {
    if (!n.readAt) {
      const res = await markOne.mutateAsync(n.id);
      if (!res.success) return;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-foreground-muted">Updates from your projects and invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">
            Unread: <span className="font-semibold text-foreground">{unreadCount}</span>
          </span>
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || unreadCount === 0}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {markAll.isPending ? 'Marking…' : 'Mark all read'}
          </button>
        </div>
      </div>

      {isLoading && <p className="text-foreground-muted">Loading…</p>}
      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-foreground-muted shadow-card">
          You're all caught up.
        </div>
      )}

      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <div
              className={cn(
                'rounded-xl border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:shadow-card-hover',
                !n.readAt && 'bg-primary/5'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{n.title}</div>
                  {n.body && <div className="mt-1 text-sm text-foreground-muted">{n.body}</div>}
                  <div className="mt-2 text-xs text-foreground-subtle">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {n.linkHref ? (
                    <Link to={n.linkHref} className="text-sm font-semibold text-primary hover:underline">
                      Open
                    </Link>
                  ) : (
                    <span className="text-xs text-foreground-subtle">—</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onItemClick(n)}
                    disabled={markOne.isPending || !!n.readAt}
                    className="text-xs font-medium text-foreground-muted hover:underline disabled:opacity-50"
                  >
                    {n.readAt ? 'Read' : 'Mark read'}
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

