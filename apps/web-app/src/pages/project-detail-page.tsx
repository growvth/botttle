import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@botttle/ui';
import {
  fetchProject,
  createMilestone,
  createTask,
  updateMilestone,
  updateTask,
  type Milestone,
  type Task,
} from '@/lib/api';

const MILESTONE_STATUS = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
const TASK_STATUS = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);

  const { data: projectRes, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
  });

  const project = projectRes?.success ? projectRes.data : null;
  const milestones = project?.milestones ?? [];

  if (!projectId || (projectRes && !projectRes.success)) {
    return (
      <div className="text-foreground-muted">
        Project not found. <Link to="/projects" className="text-primary hover:underline">Back to projects</Link>
      </div>
    );
  }

  if (isLoading || !project) {
    return <p className="text-foreground-muted">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{project.title}</h1>
        {project.description && (
          <p className="mt-1 text-foreground-muted">{project.description}</p>
        )}
        <div className="mt-2 flex gap-2 text-sm">
          <span className="rounded bg-primary-pale px-2 py-0.5 text-primary">{project.status}</span>
          {project.client && (
            <span className="text-foreground-muted">Client: {project.client.name}</span>
          )}
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Milestones</h2>
          <button
            type="button"
            onClick={() => setAddingMilestone((s) => !s)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            {addingMilestone ? 'Cancel' : 'Add milestone'}
          </button>
        </div>

        {addingMilestone && (
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
      className="mb-4 flex gap-2 rounded-lg border border-border bg-background p-3"
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
        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
      />
      <button
        type="submit"
        disabled={create.isPending || !title.trim()}
        className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
      >
        Add
      </button>
      <button type="button" onClick={onDone} className="rounded-md border border-border px-4 py-2 text-sm">
        Cancel
      </button>
    </form>
  );
}

function MilestoneCard({
  projectId,
  milestone,
  addingTask,
  onToggleAddTask,
  onTasksChange,
}: {
  projectId: string;
  milestone: Milestone;
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
    <div className="rounded-lg border border-border bg-background p-4 shadow-subtle">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-foreground">{milestone.title}</span>
          <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs text-foreground-muted">
            {milestone.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editingProgress ? (
            <>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-foreground-muted">{progress}%</span>
              <button
                type="button"
                onClick={() => {
                  updateMilestoneMutation.mutate({ completionPercentage: progress });
                  setEditingProgress(false);
                }}
                className="text-sm text-primary hover:underline"
              >
                Save
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditingProgress(true)}
              className="text-sm text-foreground-muted hover:text-foreground"
            >
              {milestone.completionPercentage}%
            </button>
          )}
          <button
            type="button"
            onClick={onToggleAddTask}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            {addingTask ? 'Cancel' : 'Add task'}
          </button>
        </div>
      </div>

      {addingTask && (
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
      className="mt-2 flex gap-2"
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
        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
      />
      <button
        type="submit"
        disabled={create.isPending || !title.trim()}
        className="rounded bg-primary px-3 py-1 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

function TaskItem({
  task,
  onUpdate,
}: {
  task: Task;
  onUpdate: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(task.status);

  const update = useMutation({
    mutationFn: (body: { status?: string }) => updateTask(task.id, body),
    onSuccess: onUpdate,
  });

  return (
    <li className="flex items-center gap-2 text-sm">
      {editing ? (
        <>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-border bg-background text-foreground"
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
            className="text-primary hover:underline"
          >
            Save
          </button>
        </>
      ) : (
        <>
          <span className={cn(task.status === 'COMPLETED' && 'line-through text-foreground-muted')}>
            {task.title}
          </span>
          <span className="text-foreground-muted">({task.status})</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-foreground-muted hover:text-foreground"
          >
            Edit
          </button>
        </>
      )}
    </li>
  );
}
