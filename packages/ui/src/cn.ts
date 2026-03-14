import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names with Tailwind conflict resolution. Use for shadcn-style components. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
