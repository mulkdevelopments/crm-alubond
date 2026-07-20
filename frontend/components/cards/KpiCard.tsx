import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function KpiCard({
  label,
  value,
  hint,
  delta,
  icon,
  accent,
  spark,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: number;
  icon?: ReactNode;
  accent?: 'brand' | 'success' | 'warning' | 'danger';
  spark?: number[];
  onClick?: () => void;
}) {
  const up = (delta ?? 0) >= 0;
  const clickable = Boolean(onClick);
  return (
    <Card
      className="p-5 relative overflow-hidden"
      interactive={clickable}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {accent && (
        <span className={cn(
          'absolute -top-12 -right-12 h-28 w-28 rounded-full blur-2xl opacity-30',
          accent === 'brand' && 'bg-brand-600',
          accent === 'success' && 'bg-emerald-500',
          accent === 'warning' && 'bg-amber-500',
          accent === 'danger' && 'bg-rose-500',
        )} />
      )}
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-3 font-semibold">{label}</p>
          <p className="mt-2 text-2xl md:text-3xl font-bold tracking-tight font-display num-tabular">{value}</p>
          {hint && <p className="text-[11px] text-3 mt-1">{hint}</p>}
        </div>
        {icon && (
          <div className="h-9 w-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-2">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 relative">
        {delta !== undefined && (
          <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
            <span className="text-3 font-normal ml-0.5">vs last month</span>
          </span>
        )}
        {spark && spark.length > 1 ? <Sparkline values={spark} positive={delta !== undefined ? up : undefined} /> : null}
      </div>
    </Card>
  );
}

function Sparkline({ values, positive }: { values: number[]; positive?: boolean }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(' ');
  const trendingUp = (values[values.length - 1] ?? 0) >= (values[0] ?? 0);
  const isPositive = positive ?? trendingUp;
  const stroke = isPositive ? '#E30613' : '#EF4444';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-20" aria-hidden>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
