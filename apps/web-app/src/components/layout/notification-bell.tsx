import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@botttle/ui';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/api';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetchNotifications({ limit: 30 });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    refetchInterval: 60_000,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function onItemClick(n: AppNotification) {
    if (!n.readAt) {
      const res = await markOne.mutateAsync(n.id);
      if (!res.success) return;
    }
    setOpen(false);
    if (n.linkHref) {
      navigate(n.linkHref);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-slide-down absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-dropdown">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {isLoading && (
              <li className="px-4 py-6 text-center text-sm text-foreground-muted">Loading…</li>
            )}
            {!isLoading && items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-foreground-muted">You're all caught up.</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50',
                    !n.readAt && 'bg-primary/5'
                  )}
                >
                  <span className="font-medium text-foreground">{n.title}</span>
                  {n.body && <span className="line-clamp-2 text-xs text-foreground-muted">{n.body}</span>}
                  <span className="text-[10px] text-foreground-subtle">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-4 py-2.5">
            <Link
              to="/notifications"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
