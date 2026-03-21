import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/pages/login-page';
import { RegisterPage } from '@/pages/register-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { ProjectsListPage } from '@/pages/projects-list-page';
import { ProjectDetailPage } from '@/pages/project-detail-page';
import { ClientsListPage } from '@/pages/clients-list-page';
import { InvoicesListPage } from '@/pages/invoices-list-page';
import { InvoiceDetailPage } from '@/pages/invoice-detail-page';
import { InvoiceCreatePage } from '@/pages/invoice-create-page';
import { ProjectReportsPage } from '@/pages/project-reports-page';
import { AuditLogsPage } from '@/pages/audit-logs-page';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsListPage />} />
          <Route path="projects/:projectId/reports" element={<ProjectReportsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="invoices" element={<InvoicesListPage />} />
          <Route
            path="invoices/new"
            element={
              <AdminRoute>
                <InvoiceCreatePage />
              </AdminRoute>
            }
          />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route
            path="clients"
            element={
              <AdminRoute>
                <ClientsListPage />
              </AdminRoute>
            }
          />
          <Route
            path="audit-logs"
            element={
              <AdminRoute>
                <AuditLogsPage />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
