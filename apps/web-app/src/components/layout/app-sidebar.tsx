import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  ScrollText,
  Sun,
  Moon,
  LogOut,
  UserCog,
  UserCircle,
} from 'lucide-react';
import { cn, useTheme } from '@botttle/ui';
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

export function AppSidebar({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
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
          <div className="mb-2 truncate px-3 text-xs text-foreground-muted">
            {user.name || user.email}
          </div>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-[18px] w-[18px] shrink-0" aria-hidden />
          ) : (
            <Moon className="h-[18px] w-[18px] shrink-0" aria-hidden />
          )}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button
          type="button"
          onClick={clearAuth}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
