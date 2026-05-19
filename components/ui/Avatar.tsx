import { cn, colorFor, initials } from '@/lib/utils';

export function Avatar({ name, size = 'md', online }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; online?: boolean }) {
  const sizes: Record<string, string> = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };
  return (
    <div className="relative inline-flex">
      <span className={cn('inline-flex items-center justify-center rounded-full font-semibold', sizes[size], colorFor(name))}>
        {initials(name)}
      </span>
      {online !== undefined && (
        <span
          className={cn(
            'absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--surface)]',
            online ? 'bg-success' : 'bg-ink-300 dark:bg-ink-600',
          )}
        />
      )}
    </div>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const visible = names.slice(0, max);
  const extra = names.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((n) => (
        <div key={n} className="ring-2 ring-[var(--surface)] rounded-full">
          <Avatar name={n} size="xs" />
        </div>
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[var(--surface-2)] text-[10px] font-semibold ring-2 ring-[var(--surface)] text-2">
          +{extra}
        </span>
      )}
    </div>
  );
}
