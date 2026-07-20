'use client';

import { cn } from '@/lib/utils';
import { STAGE_TONES, type Stage } from '@/lib/data';

export function StagePicker({
  value,
  options,
  labelFor,
  onChange,
}: {
  value: Stage;
  options: Stage[];
  labelFor: (stage: Stage) => string;
  onChange: (stage: Stage) => void;
}) {
  return (
    <div className="rounded-xl border border-brand-600/30 bg-brand-600/[0.05] px-2.5 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600">Pipeline stage</p>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
            STAGE_TONES[value],
          )}
        >
          {labelFor(value)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1" role="listbox" aria-label="Pipeline stage">
        {options.map((stage) => {
          const active = value === stage;
          return (
            <button
              key={stage}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onChange(stage)}
              className={cn(
                'h-7 px-2 rounded-lg border text-[11px] font-semibold transition-colors',
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-[var(--border)] bg-[var(--surface)] text-2 hover:border-brand-600/40',
              )}
            >
              {labelFor(stage)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
