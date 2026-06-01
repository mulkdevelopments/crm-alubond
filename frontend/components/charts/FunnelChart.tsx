'use client';
import { formatAED } from '@/lib/utils';

export function FunnelChart({ data }: { data: { stage: string; count: number; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const w = Math.max(8, (d.value / max) * 100);
        const tone = ['bg-ink-200 dark:bg-ink-800', 'bg-sky-200 dark:bg-sky-900/60', 'bg-violet-200 dark:bg-violet-900/60', 'bg-indigo-200 dark:bg-indigo-900/60', 'bg-amber-200 dark:bg-amber-900/60', 'bg-orange-200 dark:bg-orange-900/60', 'bg-teal-200 dark:bg-teal-900/60', 'bg-brand-200 dark:bg-brand-900/60'][i % 8];
        return (
          <div key={d.stage} className="grid grid-cols-[140px,1fr,auto] items-center gap-3">
            <span className="text-xs text-2 truncate">{d.stage}</span>
            <div className="relative h-7 rounded-lg bg-[var(--surface-2)] overflow-hidden">
              <div className={`absolute inset-y-0 left-0 ${tone} transition-all`} style={{ width: `${w}%` }} />
              <span className="absolute inset-y-0 left-2.5 flex items-center text-[11px] font-semibold tracking-tight num-tabular">
                {d.count} {d.count === 1 ? 'project' : 'projects'}
              </span>
            </div>
            <span className="text-xs font-semibold num-tabular tabular-nums whitespace-nowrap">{formatAED(d.value, true)}</span>
          </div>
        );
      })}
    </div>
  );
}
