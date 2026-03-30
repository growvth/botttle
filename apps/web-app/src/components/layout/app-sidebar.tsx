import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  ScrollText,
  LogOut,
  UserCog,
  UserCircle,
} from 'lucide-react';
import { cn } from '@botttle/ui';
import { useAuthStore } from '@/stores/auth-store';
import { BrandLogo } from '@/components/brand-logo';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users, adminOnly: true },
  { to: '/users', label: 'Users', icon: UserCog, adminOnly: true },
  { to: '/audit-logs', label: 'Audit log', icon: ScrollText, adminOnly: true },
  { to: '/settings', label: 'Account', icon: UserCircle },
] as const;

function isNavActive(pathname: string, to: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (to === '/') return path === '/' || path === '';
  return path.startsWith(to);
}

function initials(nameOrEmail: string): string {
  const s = nameOrEmail.trim();
  if (!s) return '?';
  const parts = s.includes('@') ? s.split('@')[0] : s.split(/\s+/);
  const a = parts[0]?.[0] ?? '?';
  const b = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${a}${b ?? ''}`.toUpperCase();
}

export function AppSidebar({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const location = useLocation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const navItems = isAdmin
    ? nav
    : nav.filter((item) => !('adminOnly' in item && item.adminOnly));

  return (
    <aside className={cn('flex w-60 flex-col border-r border-border bg-surface', className)}>
      <div className="flex h-16 items-center gap-2.5 px-5">
        <BrandLogo className="h-8 w-8 object-contain" />
        <span className="text-lg font-bold tracking-tight text-foreground">botttle</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = isNavActive(location.pathname, to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
                active
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-foreground-muted hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  active ? 'text-primary' : 'text-foreground-subtle group-hover:text-foreground-muted'
                )}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-border px-3 py-3">
        {user && (
          <div className="mb-2 rounded-xl border border-border bg-surface px-3 py-2.5">
            <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {initials(user.name || user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">
                {user.name?.trim() || user.email}
              </div>
              <div className="truncate text-xs text-foreground-muted">{user.email}</div>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                user.role === 'ADMIN'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-foreground-muted'
              )}
              aria-label={`Role: ${user.role}`}
              title={`Role: ${user.role}`}
            >
              {user.role === 'ADMIN' ? 'Admin' : 'Client'}
            </span>
            </div>
            <button
              type="button"
              onClick={clearAuth}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
