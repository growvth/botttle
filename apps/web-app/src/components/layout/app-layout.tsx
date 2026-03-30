import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@botttle/ui';
import { AppSidebar } from './app-sidebar';
import { NotificationBell } from './notification-bell';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    if (!mobileOpen) return;
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar className="hidden md:flex" />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <AppSidebar
            className="absolute left-0 top-0 h-full w-[min(18rem,85vw)] shadow-xl"
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className={cn(
              'md:hidden rounded-lg p-2 text-foreground-muted transition-colors hover:bg-muted hover:text-foreground',
              mobileOpen && 'bg-muted text-foreground'
            )}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>

          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
