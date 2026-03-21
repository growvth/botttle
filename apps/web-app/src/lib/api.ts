import { useAuthStore } from '@/stores/auth-store';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'botttle_access_token';

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null; _retried?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { token = getStoredToken(), _retried, ...init } = options;
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (res.status === 401 && !_retried && !AUTH_PATHS.some((p) => path.startsWith(p))) {
    const state = useAuthStore.getState();
    const refreshToken = state.refreshToken;
    if (refreshToken) {
      const refreshRes = await refresh(refreshToken);
      if (refreshRes.success && state.user) {
        state.setAuth(refreshRes.data.accessToken, refreshRes.data.refreshToken, state.user);
        return api<T>(path, { ...init, token: refreshRes.data.accessToken, _retried: true });
      }
    }
    state.clearAuth();
  }

  if (!res.ok) {
    return json as ApiError;
  }
  return json;
}

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string; name: string | null };
};

export async function login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
  return api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    token: null,
  });
}

export async function register(body: {
  email: string;
  password: string;
  name?: string;
  role?: 'ADMIN' | 'CLIENT';
}): Promise<ApiResponse<LoginResponse>> {
  return api<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    token: null,
  });
}

export async function refresh(refreshToken: string): Promise<
  ApiResponse<{ accessToken: string; refreshToken: string }>
> {
  return api<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
    token: null,
  });
}

// Projects
export type Project = {
  id: string;
  title: string;
  description: string | null;
  clientId: string;
  client?: { id: string; name: string; email: string | null };
  status: string;
  progress: number;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  milestones?: Milestone[];
  _count?: { milestones: number };
};

export async function fetchProjects(): Promise<ApiResponse<Project[]>> {
  return api<Project[]>('/projects');
}

export async function fetchProject(id: string): Promise<ApiResponse<Project>> {
  return api<Project>(`/projects/${id}`);
}

export async function createProject(body: {
  title: string;
  description?: string;
  clientId: string;
  status?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse<Project>> {
  return api<Project>('/projects', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateProject(
  id: string,
  body: Partial<{ title: string; description: string | null; status: string; progress: number; budget: number | null; startDate: string | null; endDate: string | null }>
): Promise<ApiResponse<Project>> {
  return api<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteProject(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/projects/${id}`, { method: 'DELETE' });
}

// Milestones
export type Milestone = {
  id: string;
  projectId: string;
  title: string;
  dueDate: string | null;
  status: string;
  completionPercentage: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
  _count?: { tasks: number };
};

export async function fetchMilestones(projectId: string): Promise<ApiResponse<Milestone[]>> {
  return api<Milestone[]>(`/projects/${projectId}/milestones`);
}

export async function createMilestone(
  projectId: string,
  body: { title: string; dueDate?: string; status?: string; completionPercentage?: number; description?: string }
): Promise<ApiResponse<Milestone>> {
  return api<Milestone>(`/projects/${projectId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateMilestone(
  id: string,
  body: Partial<{ title: string; dueDate: string | null; status: string; completionPercentage: number; description: string | null }>
): Promise<ApiResponse<Milestone>> {
  return api<Milestone>(`/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteMilestone(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/milestones/${id}`, { method: 'DELETE' });
}

// Tasks
export type Task = {
  id: string;
  milestoneId: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchTasks(projectId: string, milestoneId: string): Promise<ApiResponse<Task[]>> {
  return api<Task[]>(`/projects/${projectId}/milestones/${milestoneId}/tasks`);
}

export async function createTask(
  projectId: string,
  milestoneId: string,
  body: { title: string; description?: string; status?: string; dueDate?: string }
): Promise<ApiResponse<Task>> {
  return api<Task>(`/projects/${projectId}/milestones/${milestoneId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateTask(
  id: string,
  body: Partial<{ title: string; description: string | null; status: string; dueDate: string | null }>
): Promise<ApiResponse<Task>> {
  return api<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteTask(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/tasks/${id}`, { method: 'DELETE' });
}

// Clients
export type Client = { id: string; name: string; email: string | null; createdAt: string };

export async function fetchClients(): Promise<ApiResponse<Client[]>> {
  return api<Client[]>('/clients');
}

export async function fetchClient(id: string): Promise<ApiResponse<Client>> {
  return api<Client>(`/clients/${id}`);
}

export async function createClient(body: {
  name: string;
  email?: string;
}): Promise<ApiResponse<Client>> {
  return api<Client>('/clients', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateClient(
  id: string,
  body: { name?: string; email?: string | null }
): Promise<ApiResponse<Client>> {
  return api<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteClient(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/clients/${id}`, { method: 'DELETE' });
}

// Invoices
export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

export type Invoice = {
  id: string;
  projectId: string;
  number: string;
  status: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; title: string; client?: { id: string; name: string; email: string | null } };
  items?: InvoiceItem[];
  payments?: Payment[];
  /** Set on GET /invoices/:id */
  totalPaid?: number;
  balanceDue?: number;
  /** Checkout URL for clients when INVOICE_PAYMENT_LINK_TEMPLATE is configured */
  paymentLink?: string | null;
  /** Admin: saved client checkout URL (optional) */
  paymentUrl?: string | null;
  /** Admin: Lemon variant id for this invoice (optional; falls back to env default) */
  lemonVariantId?: string | null;
};

export async function fetchInvoices(): Promise<ApiResponse<Invoice[]>> {
  return api<Invoice[]>('/invoices');
}

export async function fetchInvoicesByProject(
  projectId: string
): Promise<ApiResponse<Invoice[]>> {
  return api<Invoice[]>(`/projects/${projectId}/invoices`);
}

export async function fetchInvoice(id: string): Promise<ApiResponse<Invoice>> {
  return api<Invoice>(`/invoices/${id}`);
}

export async function createInvoice(body: {
  projectId: string;
  dueDate: string;
  currency?: string;
  taxRate?: number;
  items: { description: string; quantity: number; unitPrice: number }[];
}): Promise<ApiResponse<Invoice>> {
  return api<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateInvoiceStatus(
  id: string,
  status: string
): Promise<ApiResponse<Invoice>> {
  return api<Invoice>(`/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function updateInvoicePaymentSettings(
  id: string,
  body: { paymentUrl?: string; lemonVariantId?: string }
): Promise<ApiResponse<Invoice>> {
  return api<Invoice>(`/invoices/${id}/payment-settings`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function createInvoiceLemonCheckout(id: string): Promise<ApiResponse<Invoice>> {
  return api<Invoice>(`/invoices/${id}/checkout/lemon`, { method: 'POST' });
}

export async function addPayment(
  invoiceId: string,
  body: { amount: number; status?: string; paidAt?: string }
): Promise<ApiResponse<Invoice>> {
  return api<Invoice>(`/invoices/${invoiceId}/payments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Download invoice PDF; triggers browser save. Returns false if request failed. */
export async function downloadInvoicePdf(invoiceId: string, filename?: string): Promise<boolean> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return false;
  const blob = await res.blob();
  const name =
    filename ||
    res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ||
    `invoice-${invoiceId}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

// Time logs
export type TimeLog = {
  id: string;
  projectId: string;
  description: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  billable: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchTimeLogs(projectId: string): Promise<ApiResponse<TimeLog[]>> {
  return api<TimeLog[]>(`/projects/${projectId}/time-logs`);
}

export async function createTimeLog(
  projectId: string,
  body: { description?: string; billable?: boolean; startedAt?: string; endedAt?: string }
): Promise<ApiResponse<TimeLog>> {
  return api<TimeLog>(`/projects/${projectId}/time-logs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function stopTimeLog(
  id: string,
  body: { endedAt?: string } = {}
): Promise<ApiResponse<TimeLog>> {
  return api<TimeLog>(`/time-logs/${id}/stop`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteTimeLog(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/time-logs/${id}`, { method: 'DELETE' });
}

// Reports
export type ClientActivityRow = {
  clientId: string;
  clientName: string;
  comments: number;
  files: number;
};

export type CollaborationFeedItem = {
  type: 'comment' | 'file';
  at: string;
  projectId: string;
  projectTitle: string;
  summary: string;
  actorLabel: string;
};

export type ReportsSummary = {
  projectCountByStatus: { status: string; count: number }[];
  invoiceCountByStatus: { status: string; count: number; total: number }[];
  clientCount: number;
  timeSeconds: { total: number; billable: number; nonBillable: number };
  totalRevenue: number;
  tasks: { completed: number; total: number };
  clientActivity30d?: ClientActivityRow[];
  collaborationFeed?: CollaborationFeedItem[];
};

export type TimeReportDay = {
  date: string;
  billableSeconds: number;
  nonBillableSeconds: number;
};

export type TimeReportRow = {
  date: string;
  projectId: string;
  projectTitle: string;
  description: string | null;
  seconds: number;
  billable: boolean;
};

export async function fetchReportsSummary(): Promise<ApiResponse<ReportsSummary>> {
  return api<ReportsSummary>('/reports/summary');
}

// Notifications
export type AppNotification = {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string | null;
  linkHref: string | null;
  projectId: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function fetchNotifications(params?: {
  limit?: number;
}): Promise<ApiResponse<{ items: AppNotification[]; unreadCount: number }>> {
  const qs = params?.limit != null ? `?limit=${params.limit}` : '';
  return api<{ items: AppNotification[]; unreadCount: number }>(`/notifications${qs}`);
}

export async function fetchNotificationUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
  return api<{ unreadCount: number }>('/notifications/unread-count');
}

export async function markNotificationRead(id: string): Promise<ApiResponse<{ ok: boolean }>> {
  return api<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<ApiResponse<{ ok: boolean }>> {
  return api<{ ok: boolean }>('/notifications/read-all', { method: 'POST' });
}

// Audit logs (admin)
export type AuditLogRow = {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; email: string; name: string | null } | null;
};

export async function fetchAuditLogs(params: {
  take?: number;
  skip?: number;
  action?: string;
  entityType?: string;
}): Promise<
  ApiResponse<{ items: AuditLogRow[]; total: number; take: number; skip: number }>
> {
  const qs = new URLSearchParams();
  if (params.take != null) qs.set('take', String(params.take));
  if (params.skip != null) qs.set('skip', String(params.skip));
  if (params.action) qs.set('action', params.action);
  if (params.entityType) qs.set('entityType', params.entityType);
  const q = qs.toString();
  return api<{ items: AuditLogRow[]; total: number; take: number; skip: number }>(
    `/audit-logs${q ? `?${q}` : ''}`
  );
}

export async function fetchReportsTime(params: {
  from: string;
  to: string;
  projectId?: string;
}): Promise<ApiResponse<{ days: TimeReportDay[]; rows: TimeReportRow[] }>> {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  if (params.projectId) qs.set('projectId', params.projectId);
  return api<{ days: TimeReportDay[]; rows: TimeReportRow[] }>(`/reports/time?${qs}`);
}

export async function downloadTimeReportCsv(params: {
  from: string;
  to: string;
  projectId?: string;
}): Promise<boolean> {
  const qs = new URLSearchParams({ from: params.from, to: params.to, format: 'csv' });
  if (params.projectId) qs.set('projectId', params.projectId);
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}/reports/time?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return false;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `time-report-${params.from}_${params.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

// Comments
export type ProjectComment = {
  id: string;
  projectId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; name: string | null; role: string };
};

export async function fetchComments(projectId: string): Promise<ApiResponse<ProjectComment[]>> {
  return api<ProjectComment[]>(`/projects/${projectId}/comments`);
}

export async function createComment(
  projectId: string,
  body: { body: string }
): Promise<ApiResponse<ProjectComment>> {
  return api<ProjectComment>(`/projects/${projectId}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteComment(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/comments/${id}`, { method: 'DELETE' });
}

// Project files
export type ProjectFileRow = {
  id: string;
  projectId: string;
  uploadedById: string;
  filename: string;
  mimeType: string | null;
  size: number;
  createdAt: string;
  uploadedBy: { id: string; email: string; name: string | null };
};

export async function fetchProjectFiles(projectId: string): Promise<ApiResponse<ProjectFileRow[]>> {
  return api<ProjectFileRow[]>(`/projects/${projectId}/files`);
}

export async function uploadProjectFile(
  projectId: string,
  file: File
): Promise<ApiResponse<ProjectFileRow>> {
  const token = getStoredToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/projects/${projectId}/files`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return (await res.json()) as ApiResponse<ProjectFileRow>;
}

export async function deleteProjectFile(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/project-files/${id}`, { method: 'DELETE' });
}

export async function downloadProjectFile(fileId: string, filename?: string): Promise<boolean> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}/project-files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return false;
  const blob = await res.blob();
  const name =
    filename ||
    res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ||
    `file-${fileId}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
