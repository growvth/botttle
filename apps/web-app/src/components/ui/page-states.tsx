import { cn } from '@botttle/ui';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <p className="text-sm text-foreground-muted">{label}</p>;
}

export function EmptyState({
  title,
  body,
  className,
}: {
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-10 text-center text-foreground-muted shadow-card',
        className
      )}
    >
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {body && <div className="mt-1 text-sm text-foreground-muted">{body}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

