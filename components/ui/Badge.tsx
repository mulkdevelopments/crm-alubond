import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-2)] text-2 border border-[var(--border)]',
  brand: 'bg-brand-600/10 text-brand-700 dark:text-brand-300 border border-brand-600/20',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-tight', TONES[tone], className)}>
      {children}
    </span>
  );
}
