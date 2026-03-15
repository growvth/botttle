import { Outlet } from 'react-router-dom';
import { useTheme } from '@botttle/ui';
import { AppSidebar } from './app-sidebar';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
