import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { fetchClients, fetchUsers, patchUser, type Client, type UserProfile } from '@/lib/api';

export function UsersListPage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: usersRes, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
  });
  const { data: clientsRes, isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => fetchClients(),
  });

  const users = usersRes?.success ? usersRes.data : [];
  const clients: Client[] = clientsRes?.success ? clientsRes.data : [];

  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Manage roles, client assignment, and access. Users sign in with their email.
        </p>
      </div>

      {loadingUsers || loadingClients ? (
        <p className="text-foreground-muted">Loading…</p>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-foreground-muted shadow-card">
          No users found.
        </div>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              {editingId === u.id ? (
                <UserEditForm
                  user={u}
                  clients={clients}
                  isSelf={u.id === currentUserId}
                  onDone={() => {
                    setEditingId(null);
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <UserRow user={u} clients={clients} onEdit={() => setEditingId(u.id)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function clientLabel(clients: Client[], id: string | null): string {
  if (!id) return '—';
  const c = clients.find((x) => x.id === id);
  return c?.name ?? id;
}

function UserRow({
  user,
  clients,
  onEdit,
}: {
  user: UserProfile;
  clients: Client[];
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-semibold text-foreground">{user.name?.trim() || user.email}</div>
        <div className="truncate text-sm text-foreground-muted">{user.email}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground-muted">
          <span>Role: {user.role}</span>
          <span>Client: {clientLabel(clients, user.clientId)}</span>
          {user.disabled && <span className="text-destructive">Disabled</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        Edit
      </button>
    </div>
  );
}

function UserEditForm({
  user,
  clients,
  isSelf,
  onDone,
  onCancel,
}: {
  user: UserProfile;
  clients: Client[];
  isSelf: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(user.name ?? '');
  const [role, setRole] = useState<'ADMIN' | 'CLIENT'>(user.role === 'ADMIN' ? 'ADMIN' : 'CLIENT');
  const [clientId, setClientId] = useState<string>(user.clientId ?? '');
  const [disabled, setDisabled] = useState(user.disabled);

  const mutation = useMutation({
    mutationFn: () =>
      patchUser(user.id, {
        name: name.trim() || undefined,
        role,
        disabled,
        clientId: clientId === '' ? null : clientId,
      }),
    onSuccess: (res) => {
      if (res.success) onDone();
    },
  });

  const err = mutation.data && !mutation.data.success ? mutation.data.error.message : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="rounded-xl border border-border bg-surface p-5 shadow-card"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
          <input type="email" value={user.email} disabled className="input-field bg-muted/50 text-foreground-muted" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'ADMIN' | 'CLIENT')}
            disabled={isSelf}
            className="input-field"
          >
            <option value="ADMIN">Admin</option>
            <option value="CLIENT">Client</option>
          </select>
          {isSelf && (
            <p className="mt-1 text-xs text-foreground-muted">You cannot change your own role here.</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Client organization</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="input-field">
            <option value="">— None —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-foreground-muted">Links this user to a client for portal scoping.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={disabled}
            onChange={(e) => setDisabled(e.target.checked)}
            disabled={isSelf}
            className="rounded border-border"
          />
          <span>Account disabled</span>
        </label>
        {isSelf && (
          <p className="text-xs text-foreground-muted">You cannot disable your own account here.</p>
        )}
        {err && (
          <p className="text-sm text-destructive" role="alert">
            {err}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
