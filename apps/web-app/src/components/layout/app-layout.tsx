import { Outlet } from 'react-router-dom';
import { AppSidebar } from './app-sidebar';
import { NotificationBell } from './notification-bell';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-border px-4 md:px-6">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
