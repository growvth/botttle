import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Square, BarChart3 } from 'lucide-react';
import { cn } from '@botttle/ui';
import { LoadingState } from '@/components/ui/page-states';
import { useAuthStore } from '@/stores/auth-store';
import {
  fetchProject,
  createMilestone,
  createTask,
  updateMilestone,
  updateTask,
  updateProject,
  fetchTimeLogs,
  createTimeLog,
  stopTimeLog,
  deleteTimeLog,
  fetchComments,
  createComment,
  deleteComment,
  fetchProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  downloadProjectFile,
  downloadTimeReportCsv,
  fetchInvoicesByProject,
  type Milestone,
  type Task,
  type TimeLog,
  type ProjectComment,
  type ProjectFileRow,
  type Invoice,
} from '@/lib/api';

const PROJECT_STATUS = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;
const PROJECT_STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground-muted',
  ACTIVE: 'bg-success-muted text-success',
  ON_HOLD: 'bg-destructive/10 text-destructive',
  COMPLETED: 'bg-primary-pale text-primary',
};
const MILESTONE_STATUS = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
const TASK_STATUS = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);

  const { data: projectRes, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
  });

  const project = projectRes?.success ? projectRes.data : null;
  const milestones = project?.milestones ?? [];
  const { data: timeLogsRes } = useQuery({
    queryKey: ['timeLogs', projectId],
    queryFn: () => fetchTimeLogs(projectId!),
    enabled: !!projectId,
  });
  const timeLogs = timeLogsRes?.success ? timeLogsRes.data : [];

  const { data: commentsRes } = useQuery({
    queryKey: ['comments', projectId],
    queryFn: () => fetchComments(projectId!),
    enabled: !!projectId,
  });
  const comments = commentsRes?.success ? commentsRes.data : [];
  const commentsLoadError = commentsRes && !commentsRes.success ? commentsRes.error.message : null;

  const { data: filesRes } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => fetchProjectFiles(projectId!),
    enabled: !!projectId,
  });
  const files = filesRes?.success ? filesRes.data : [];
  const filesLoadError = filesRes && !filesRes.success ? filesRes.error.message : null;

  const { data: projectInvoicesRes } = useQuery({
    queryKey: ['projectInvoices', projectId],
    queryFn: () => fetchInvoicesByProject(projectId!),
    enabled: !!projectId,
  });
  const projectInvoices = projectInvoicesRes?.success ? projectInvoicesRes.data : [];

  const updateProjectMutation = useMutation({
    mutationFn: (body: { status: string }) => updateProject(projectId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  if (!projectId || (projectRes && !projectRes.success)) {
    return (
      <div className="text-foreground-muted">
        Project not found. <Link to="/projects" className="font-medium text-primary hover:underline">Back to projects</Link>
      </div>
    );
  }

  if (isLoading || !project) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Projects
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{project.title}</h1>
        {project.description && (
          <p className="mt-1 text-foreground-muted">{project.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={cn('badge', PROJECT_STATUS_STYLE[project.status] ?? 'bg-muted text-foreground-muted')}>
            {project.status}
          </span>
          {isAdmin && (
            <select
              value={project.status}
              onChange={(e) => updateProjectMutation.mutate({ status: e.target.value })}
              disabled={updateProjectMutation.isPending}
              className="input-field !w-auto !py-1 !text-xs"
            >
              {PROJECT_STATUS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          {isAdmin && project.client && (
            <span className="text-foreground-muted">Client: {project.client.name}</span>
          )}
        </div>
        {isAdmin && (
          <Link
            to={`/projects/${projectId}/reports`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <BarChart3 className="h-4 w-4" aria-hidden />
            Time reports
          </Link>
        )}
      </div>

      <ProjectInvoicesSection projectId={projectId} invoices={projectInvoices} isAdmin={isAdmin} />
      {isAdmin && <TimeLogsSection projectId={projectId} logs={timeLogs} />}
      <CommentsSection projectId={projectId} comments={comments} loadError={commentsLoadError} />
      <FilesSection projectId={projectId} files={files} loadError={filesLoadError} readOnly={!isAdmin} />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Milestones</h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAddingMilestone((s) => !s)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-semibold transition-all',
                addingMilestone
                  ? 'border border-border bg-surface text-foreground hover:bg-muted'
                  : 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98]'
              )}
            >
              {addingMilestone ? 'Cancel' : 'Add milestone'}
            </button>
          )}
        </div>

        {isAdmin && addingMilestone && (
          <AddMilestoneForm
            projectId={projectId}
            onDone={() => {
              setAddingMilestone(false);
              queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            }}
          />
        )}

        <div className="mt-4 space-y-4">
          {milestones.length === 0 && !addingMilestone ? (
            <p className="text-sm text-foreground-muted">No milestones yet.</p>
          ) : (
            milestones.map((m) => (
              <MilestoneCard
                key={m.id}
                projectId={projectId}
                milestone={m}
                readOnly={!isAdmin}
                addingTask={addingTaskFor === m.id}
                onToggleAddTask={() => setAddingTaskFor((id) => (id === m.id ? null : m.id))}
                onTasksChange={() => queryClient.invalidateQueries({ queryKey: ['project', projectId] })}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, seconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

const INV_STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground-muted',
  SENT: 'bg-primary-pale text-primary',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PAID: 'bg-success-muted text-success',
  OVERDUE: 'bg-destructive/10 text-destructive',
};

const INV_CLIENT_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Awaiting payment',
  PARTIAL: 'Partially paid',
  PAID: 'Paid',
  OVERDUE: 'Past due',
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
}

function ProjectInvoicesSection({
  invoices,
  isAdmin,
}: {
  projectId: string;
  invoices: Invoice[];
  isAdmin: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Invoices</h2>
      {invoices.length === 0 ? (
        <p className="text-sm text-foreground-muted">No invoices for this project yet.</p>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-card transition-all duration-200 hover:shadow-card-hover"
            >
              <Link to={`/invoices/${inv.id}`} className="font-semibold text-primary hover:underline">
                {inv.number}
              </Link>
              <span className="text-foreground-muted">{formatMoney(inv.total, inv.currency)}</span>
              <span className={cn('badge', INV_STATUS_STYLE[inv.status] ?? 'bg-muted text-foreground-muted')}>
                {isAdmin ? inv.status : INV_CLIENT_LABEL[inv.status] ?? inv.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TimeLogsSection({ projectId, logs }: { projectId: string; logs: TimeLog[] }) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [billableOnly, setBillableOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 89);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);
  const totalTrackedSeconds = useMemo(
    () => logs.reduce((sum, log) => sum + (log.durationSeconds ?? 0), 0),
    [logs]
  );
  const billableTrackedSeconds = useMemo(
    () => logs.filter((l) => l.billable !== false).reduce((sum, log) => sum + (log.durationSeconds ?? 0), 0),
    [logs]
  );
  const visibleLogs = useMemo(
    () => (billableOnly ? logs.filter((l) => l.billable !== false) : logs),
    [billableOnly, logs]
  );

  const create = useMutation({
    mutationFn: () => createTimeLog(projectId, { description: description.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeLogs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setDescription('');
    },
  });

  const stop = useMutation({
    mutationFn: (id: string) => stopTimeLog(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeLogs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTimeLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeLogs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const runningLog = useMemo(() => logs.find((l) => !l.endedAt) ?? null, [logs]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold text-foreground">Time tracking</h2>
          <p className="text-xs text-foreground-muted">
            Total tracked: {formatDuration(totalTrackedSeconds)} · Billable: {formatDuration(billableTrackedSeconds)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await downloadTimeReportCsv({ from: exportRange.from, to: exportRange.to, projectId });
              } finally {
                setExporting(false);
              }
            }}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV (90d)'}
          </button>
          <button
            type="button"
            onClick={() => { if (!runningLog) create.mutate(); }}
            disabled={!!runningLog || create.isPending}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all',
              runningLog
                ? 'bg-muted text-foreground-muted'
                : 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98]'
            )}
          >
            <Play className="h-4 w-4" aria-hidden />
            {runningLog ? 'Running' : 'Start timer'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (description.trim()) create.mutate();
          }}
        >
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a manual time log description"
            className="input-field min-w-[200px] flex-1 !py-2"
          />
          <button
            type="submit"
            disabled={create.isPending || !description.trim()}
            className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Add entry
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <p className="text-foreground-muted">Showing {visibleLogs.length} of {logs.length} entries</p>
          <label className="inline-flex items-center gap-1.5 text-foreground-muted">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-border accent-primary"
              checked={billableOnly}
              onChange={(e) => setBillableOnly(e.target.checked)}
            />
            Billable only
          </label>
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          {visibleLogs.length === 0 ? (
            <p className="text-foreground-muted">No time logs yet.</p>
          ) : (
            visibleLogs.map((log) => {
              const started = new Date(log.startedAt).toLocaleString();
              const ended = log.endedAt ? new Date(log.endedAt).toLocaleString() : null;
              const isRunning = !log.endedAt;
              return (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {log.description || (isRunning ? 'Running timer' : 'Time entry')}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      {started}
                      {ended ? ` → ${ended}` : ''}
                      {log.billable === false ? ' · Non-billable' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {isRunning ? 'In progress' : formatDuration(log.durationSeconds)}
                    </span>
                    {isRunning && (
                      <button
                        type="button"
                        onClick={() => stop.mutate(log.id)}
                        disabled={stop.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <Square className="h-3 w-3" aria-hidden />
                        Stop
                      </button>
                    )}
                    {!isRunning && (
                      <button
                        type="button"
                        onClick={() => remove.mutate(log.id)}
                        disabled={remove.isPending}
                        className="text-xs text-foreground-muted transition-colors hover:text-destructive"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function CommentsSection({
  projectId,
  comments,
  loadError,
}: {
  projectId: string;
  comments: ProjectComment[];
  loadError: string | null;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [body, setBody] = useState('');
  const [postError, setPostError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createComment(projectId, { body: body.trim() }),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['reports', 'summary'] });
        setBody('');
        setPostError(null);
      } else {
        setPostError(res.error.message);
      }
    },
    onError: (e: Error) => setPostError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', projectId] }),
  });

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Comments</h2>
      {loadError && (
        <p className="text-sm font-medium text-destructive" role="alert">
          Could not load comments: {loadError}
        </p>
      )}
      {postError && (
        <p className="text-sm font-medium text-destructive" role="alert">{postError}</p>
      )}
      <form
        className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) create.mutate();
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write an update for this project…"
          rows={2}
          className="input-field min-h-[72px] flex-1"
        />
        <button
          type="submit"
          disabled={create.isPending || !body.trim()}
          className="h-fit rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
        >
          Post
        </button>
      </form>
      <ul className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-sm text-foreground-muted">No comments yet.</p>
        ) : (
          comments.map((c) => {
            const who = c.user.name || c.user.email;
            const canDelete = user?.role === 'ADMIN' || c.userId === user?.id;
            return (
              <li key={c.id} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{who}</span>
                  <span className="text-xs text-foreground-muted">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-foreground">{c.body}</p>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(c.id)}
                    disabled={remove.isPending}
                    className="mt-2 text-xs text-foreground-muted transition-colors hover:text-destructive"
                  >
                    Delete
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilesSection({
  projectId,
  files,
  loadError,
  readOnly,
}: {
  projectId: string;
  files: ProjectFileRow[];
  loadError: string | null;
  readOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => deleteProjectFile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] }),
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Files</h2>
        {!readOnly && (
          <label className="cursor-pointer rounded-lg border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
            {uploading ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt"
              disabled={uploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setUploadError(null);
                setUploading(true);
                try {
                  const res = await uploadProjectFile(projectId, f);
                  if (res.success) {
                    queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    queryClient.invalidateQueries({ queryKey: ['reports', 'summary'] });
                  } else {
                    setUploadError(res.error.message);
                  }
                } catch (err) {
                  setUploadError(err instanceof Error ? err.message : 'Upload failed');
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        )}
      </div>
      {loadError && (
        <p className="text-sm font-medium text-destructive" role="alert">
          Could not load files: {loadError}
        </p>
      )}
      {uploadError && (
        <p className="text-sm font-medium text-destructive" role="alert">{uploadError}</p>
      )}
      <p className="text-xs text-foreground-muted">PDF, images, or plain text, up to 10MB.</p>
      <ul className="space-y-2">
        {files.length === 0 ? (
          <p className="text-sm text-foreground-muted">No files yet.</p>
        ) : (
          files.map((f) => {
            const canDelete = user?.role === 'ADMIN' || f.uploadedById === user?.id;
            return (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-card"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => downloadProjectFile(f.id, f.filename)}
                    className="truncate text-left font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                  >
                    {f.filename}
                  </button>
                  <p className="text-xs text-foreground-muted">
                    {formatFileSize(f.size)} · {f.uploadedBy.name || f.uploadedBy.email}
                  </p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(f.id)}
                    disabled={remove.isPending}
                    className="text-xs text-foreground-muted transition-colors hover:text-destructive"
                  >
                    Delete
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

function AddMilestoneForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => createMilestone(projectId, { title: title.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setTitle('');
      onDone();
    },
  });

  return (
    <form
      className="mb-4 flex gap-2 rounded-xl border border-border bg-surface p-4 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) create.mutate();
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Milestone title"
        className="input-field flex-1"
      />
      <button
        type="submit"
        disabled={create.isPending || !title.trim()}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
      >
        Add
      </button>
      <button type="button" onClick={onDone} className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
        Cancel
      </button>
    </form>
  );
}

function MilestoneCard({
  projectId,
  milestone,
  readOnly,
  addingTask,
  onToggleAddTask,
  onTasksChange,
}: {
  projectId: string;
  milestone: Milestone;
  readOnly?: boolean;
  addingTask: boolean;
  onToggleAddTask: () => void;
  onTasksChange: () => void;
}) {
  const queryClient = useQueryClient();
  const [editingProgress, setEditingProgress] = useState(false);
  const [progress, setProgress] = useState(milestone.completionPercentage);

  const updateMilestoneMutation = useMutation({
    mutationFn: (body: { completionPercentage?: number; status?: string }) =>
      updateMilestone(milestone.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const tasks = milestone.tasks ?? [];

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-foreground">{milestone.title}</span>
          <span className="badge bg-muted text-foreground-muted">{milestone.status}</span>
        </div>
        <div className="flex items-center gap-2">
          {readOnly ? (
            <span className="text-sm font-medium text-foreground-muted">{milestone.completionPercentage}%</span>
          ) : editingProgress ? (
            <>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-24 accent-primary"
              />
              <span className="text-sm font-medium text-foreground-muted">{progress}%</span>
              <button
                type="button"
                onClick={() => {
                  updateMilestoneMutation.mutate({ completionPercentage: progress });
                  setEditingProgress(false);
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                Save
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditingProgress(true)}
                className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
              >
                {milestone.completionPercentage}%
              </button>
              <button
                type="button"
                onClick={onToggleAddTask}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {addingTask ? 'Cancel' : 'Add task'}
              </button>
            </>
          )}
        </div>
      </div>

      {!readOnly && addingTask && (
        <AddTaskForm
          projectId={projectId}
          milestoneId={milestone.id}
          onDone={() => {
            onToggleAddTask();
            onTasksChange();
          }}
        />
      )}

      <ul className="mt-3 space-y-1 pl-4">
        {tasks.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            readOnly={readOnly}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ['project', projectId] })}
          />
        ))}
      </ul>
    </div>
  );
}

function AddTaskForm({
  projectId,
  milestoneId,
  onDone,
}: {
  projectId: string;
  milestoneId: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => createTask(projectId, milestoneId, { title: title.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setTitle('');
      onDone();
    },
  });

  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) create.mutate();
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="input-field flex-1 !py-2"
      />
      <button
        type="submit"
        disabled={create.isPending || !title.trim()}
        className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

function TaskItem({
  task,
  readOnly,
  onUpdate,
}: {
  task: Task;
  readOnly?: boolean;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(task.status);

  const update = useMutation({
    mutationFn: (body: { status?: string }) => updateTask(task.id, body),
    onSuccess: onUpdate,
  });

  return (
    <li className="flex items-center gap-2 text-sm">
      {readOnly ? (
        <>
          <span className={cn(task.status === 'COMPLETED' && 'line-through text-foreground-muted')}>
            {task.title}
          </span>
          <span className="badge bg-muted text-foreground-muted text-[10px]">{task.status}</span>
        </>
      ) : editing ? (
        <>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field !w-auto !py-1 !text-xs"
          >
            {TASK_STATUS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              update.mutate({ status });
              setEditing(false);
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Save
          </button>
        </>
      ) : (
        <>
          <span className={cn(task.status === 'COMPLETED' && 'line-through text-foreground-muted')}>
            {task.title}
          </span>
          <span className="badge bg-muted text-foreground-muted text-[10px]">{task.status}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-foreground-muted transition-colors hover:text-foreground"
          >
            Edit
          </button>
        </>
      )}
    </li>
  );
}
