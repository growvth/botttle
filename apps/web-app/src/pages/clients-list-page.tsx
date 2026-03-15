import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
  type Client,
} from '@/lib/api';

export function ClientsListPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: clientsRes, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => fetchClients(),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; email?: string }) => createClient(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowCreate(false);
    },
  });

  const clients = clientsRes?.success ? clientsRes.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-subtle hover:bg-primary-hover"
          >
            {showCreate ? 'Cancel' : 'New client'}
          </button>
        )}
      </div>

      {showCreate && isAdmin && (
        <ClientForm
          onSubmit={(body) => createMutation.mutate(body)}
          isSubmitting={createMutation.isPending}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {isLoading ? (
        <p className="text-foreground-muted">Loading clients…</p>
      ) : clients.length === 0 ? (
        <div className="rounded-lg border border-border bg-background p-8 text-center text-foreground-muted">
          No clients yet.{' '}
          {isAdmin
            ? 'Create one above to assign to projects.'
            : 'Only admins can create clients. The first registered user is an admin.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id}>
              {editingId === c.id && isAdmin ? (
                <ClientEditForm
                  client={c}
                  onDone={() => {
                    setEditingId(null);
                    queryClient.invalidateQueries({ queryKey: ['clients'] });
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <ClientRow
                  client={c}
                  isAdmin={isAdmin}
                  onEdit={() => setEditingId(c.id)}
                  onDelete={() => {
                    if (confirm('Delete this client? Projects linked to them will be affected.')) {
                      deleteClient(c.id).then(() =>
                        queryClient.invalidateQueries({ queryKey: ['clients'] })
                      );
                    }
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientRow({
  client,
  isAdmin,
  onEdit,
  onDelete,
}: {
  client: Client;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4 shadow-subtle">
      <div>
        <span className="font-medium text-foreground">{client.name}</span>
        {client.email && (
          <span className="ml-2 text-sm text-foreground-muted">{client.email}</span>
        )}
      </div>
      {isAdmin && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded border border-border px-3 py-1 text-sm hover:bg-muted"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded border border-border px-3 py-1 text-sm text-destructive hover:bg-destructive/10"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ClientForm({
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  onSubmit: (body: { name: string; email?: string }) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), email: email.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-background p-4">
      <h2 className="mb-3 text-lg font-medium text-foreground">New client</h2>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-foreground-muted">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-foreground-muted">Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function ClientEditForm({
  client,
  onDone,
  onCancel,
}: {
  client: Client;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? '');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; email?: string | null }) =>
      updateClient(client.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onDone();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    updateMutation.mutate({ name: name.trim(), email: email.trim() || null });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-background p-4"
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-foreground-muted">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-foreground-muted">Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={updateMutation.isPending || !name.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
