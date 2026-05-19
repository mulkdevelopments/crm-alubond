import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="px-4 lg:px-8 pt-6 lg:pt-8 pb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-widest text-3 font-semibold mb-1.5">{eyebrow}</p>
        )}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display">{title}</h1>
        {subtitle && <p className="text-sm text-2 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
