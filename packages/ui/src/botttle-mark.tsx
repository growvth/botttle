import { useId } from 'react';
import { cn } from './cn';

const PATH_OUTLINE =
  'M26 8 h12 v8 l4 8 v28 c0 3-2 5-5 5 H27 c-3 0-5-2-5-5 V24 l4-8 V8z';

type BotttleMarkProps = {
  className?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
};

/**
 * Inline bottle mark (same paths as `public/botttle.svg`). Color follows `--color-primary` (theme).
 */
export function BotttleMark({ className, 'aria-label': ariaLabel, 'aria-hidden': ariaHidden }: BotttleMarkProps) {
  const id = useId();
  const clipId = `botttle-clip-${id.replace(/[:]/g, '')}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={cn('inline-block shrink-0', className)}
      style={{ color: 'var(--color-primary)' }}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      role={ariaLabel ? 'img' : undefined}
    >
      {ariaLabel ? <title>{ariaLabel}</title> : null}
      <defs>
        <clipPath id={clipId}>
          <path d={PATH_OUTLINE} />
        </clipPath>
      </defs>
      <path
        d={PATH_OUTLINE}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        fill="none"
      />
      <g clipPath={`url(#${clipId})`}>
        <path d="M16 42 Q 24 36, 32 42 T 48 42 L 48 60 L 16 60 Z" fill="currentColor" />
      </g>
    </svg>
  );
}
