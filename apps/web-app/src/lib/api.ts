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
