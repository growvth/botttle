import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@botttle/ui';
import { useAuthStore } from '@/stores/auth-store';
import {
  fetchProjects,
  fetchClients,
  createProject,
  type Project,
  type Client,
} from '@/lib/api';
import { EmptyState, LoadingState } from '@/components/ui/page-states';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground-muted',
  ACTIVE: 'bg-success-muted text-success',
  ON_HOLD: 'bg-destructive/10 text-destructive',
  COMPLETED: 'bg-primary-pale text-primary',
};

export function ProjectsListPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [showCreate, setShowCreate] = useState(false);

  const { data: projectsRes, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => fetchProjects(),
  });

  const { data: clientsRes } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => fetchClients(),
    enabled: isAdmin && showCreate,
  });

  const createMutation = useMutation({
    mutationFn: (body: { title: string; description?: string; clientId: string }) =>
      createProject(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
    },
  });

  const projects = projectsRes?.success ? projectsRes.data : [];
  const clients = clientsRes?.success ? clientsRes.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className={cn(
              'rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
              showCreate
                ? 'border border-border bg-surface text-foreground hover:bg-muted'
                : 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98]'
            )}
          >
            {showCreate ? 'Cancel' : 'New project'}
          </button>
        )}
      </div>

      {showCreate && isAdmin && (
        <CreateProjectForm
          clients={clients}
          onSubmit={(body) => createMutation.mutate(body)}
          isSubmitting={createMutation.isPending}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {isLoading ? (
        <LoadingState label="Loading projects…" />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body={
            isAdmin
              ? 'Create one above (you need at least one client first).'
              : 'Only admins can create projects. The first registered user is an admin.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const statusColor = STATUS_COLORS[project.status] ?? 'bg-muted text-foreground-muted';
  const milestoneCount = project.milestones?.length ?? project._count?.milestones ?? 0;

  return (
    <li>
      <Link
        to={`/projects/${project.id}`}
        className="group flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
      >
        <div>
          <span className="font-semibold text-foreground transition-colors group-hover:text-primary">{project.title}</span>
          {project.client && (
            <span className="ml-2 text-sm text-foreground-muted">{project.client.name}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground-muted">{milestoneCount} milestones</span>
          <span className={cn('badge', statusColor)}>
            {project.status}
          </span>
        </div>
      </Link>
    </li>
  );
}

function CreateProjectForm({
  clients,
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  clients: Client[];
  onSubmit: (body: { title: string; description?: string; clientId: string }) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !clientId) return;
    onSubmit({ title: title.trim(), description: description.trim() || undefined, clientId });
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in-up rounded-xl border border-border bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-lg font-semibold text-foreground">New project</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input-field"
            required
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            rows={2}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !clientId}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? 'Creating…' : 'Create'}
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
