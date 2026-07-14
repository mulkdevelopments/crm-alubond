'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { groupProjectsByCustomer } from '@/lib/group-projects-by-customer';
import { cn } from '@/lib/utils';

type PipelineCustomerGroupListProps<T extends { id: string; developer: string }> = {
  projects: T[];
  expandedCustomers: Record<string, boolean>;
  onToggleCustomer: (customer: string) => void;
  renderProject: (project: T) => ReactNode;
  className?: string;
  groupClassName?: string;
  headerClassName?: string;
  projectsClassName?: string;
};

export function PipelineCustomerGroupList<T extends { id: string; developer: string }>({
  projects,
  expandedCustomers,
  onToggleCustomer,
  renderProject,
  className,
  groupClassName,
  headerClassName,
  projectsClassName,
}: PipelineCustomerGroupListProps<T>) {
  const groups = groupProjectsByCustomer(projects);

  return (
    <div className={cn('space-y-2', className)}>
      {groups.map((group) => {
        const expanded = Boolean(expandedCustomers[group.customer]);
        return (
          <section
            key={group.customer}
            className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)]', groupClassName)}
          >
            <button
              type="button"
              onClick={() => onToggleCustomer(group.customer)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors',
                headerClassName,
              )}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-3" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-3" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{group.customer}</span>
              <span className="shrink-0 text-[11px] text-3">
                {group.projects.length} project{group.projects.length === 1 ? '' : 's'}
              </span>
            </button>
            {expanded ? (
              <div className={cn('space-y-2 border-t border-[var(--border)] p-2', projectsClassName)}>
                {group.projects.map((project) => (
                  <div key={project.id}>{renderProject(project)}</div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
