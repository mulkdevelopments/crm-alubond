'use client';
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const V: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-brand',
  secondary:
    'bg-[var(--surface)] text-[var(--text)] border border-[var(--border-strong)] hover:bg-[var(--surface-2)]',
  ghost: 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
  soft: 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border-strong)]',
};
const S: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  icon,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-600/40 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        V[variant],
        S[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
