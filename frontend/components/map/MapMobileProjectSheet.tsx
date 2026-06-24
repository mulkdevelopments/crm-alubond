'use client';

import Link from 'next/link';
import { LocateFixed, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import type { ApiProject, ProjectActivity } from '@/lib/projects-api';
import { formatProjectValue } from '@/lib/utils';

export function MapMobileProjectSheet({
  project,
  viewerRole,
  latestActivity,
  stageMeta,
  stageLabel,
  onClose,
  onFocus,
}: {
  project: ApiProject;
  viewerRole?: string;
  latestActivity: ProjectActivity | null;
  stageMeta: {
    tone: 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
    icon: LucideIcon;
  };
  stageLabel: (stage: string) => string;
  onClose: () => void;
  onFocus: () => void;
}) {
  const StageIcon = stageMeta.icon;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-2xl border border-[var(--border)] border-b-0 bg-[var(--surface)] shadow-[0_-10px_28px_rgba(0,0,0,0.14)]">
      <div className="mx-auto mb-1.5 mt-2 h-1 w-10 rounded-full bg-[var(--border)]" aria-hidden />
      <div className="max-h-[min(42vh,220px)] overflow-y-auto px-3 pb-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight line-clamp-2">{project.name}</p>
            <p className="text-xs text-2 truncate">{project.city}, {project.country}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project preview"
            className="shrink-0 rounded-lg p-1.5 text-3 hover:bg-[var(--surface-2)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Badge tone={stageMeta.tone} className="!text-[10px] !inline-flex !items-center !gap-1">
            <StageIcon className="h-3 w-3" /> {stageLabel(project.stage)}
          </Badge>
          <span className="text-xs font-semibold num-tabular">{formatProjectValue(project, viewerRole, true)}</span>
        </div>

        {latestActivity && (
          <p className="mt-2 text-[11px] text-3 line-clamp-2">
            <span className="font-medium text-[var(--text)]">
              {latestActivity.type} · {latestActivity.createdByName ?? 'System'}
            </span>
            {' — '}
            {latestActivity.message.split('\n')[0] || 'Activity logged.'}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onFocus}
            className="h-9 rounded-lg inline-flex items-center justify-center gap-1 text-xs font-medium bg-brand-600 text-white hover:bg-brand-700"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            <span className="truncate">Focus</span>
          </button>
          <Link
            href={`/projects/${project.id}`}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] inline-flex items-center justify-center text-xs font-medium text-brand-600 hover:bg-[var(--surface-2)]"
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}
