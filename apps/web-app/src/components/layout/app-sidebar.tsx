import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Users, FileText, ScrollText, Sun, Moon, LogOut } from 'lucide-react';
import { cn, useTheme } from '@botttle/ui';
import { useAuthStore } from '@/stores/auth-store';
import { BrandLogo } from '@/components/brand-logo';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/audit-logs', label: 'Audit log', icon: ScrollText },
] as const;

function isNavActive(pathname: string, to: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (to === '/') return path === '/' || path === '';
  return path.startsWith(to);
}

export function AppSidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const navItems = isAdmin
    ? nav
    : nav.filter((item) => item.to !== '/clients' && item.to !== '/audit-logs');

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-background">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <BrandLogo className="h-8 w-8 object-contain" />
        <span className="font-semibold text-foreground">botttle</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isNavActive(location.pathname, to)
                ? 'bg-primary-pale text-primary'
                : 'text-foreground-muted hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-border p-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground-muted hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Moon className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <button
          type="button"
          onClick={clearAuth}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground-muted hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
