'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';

import { groupProjectsByCustomer } from '@/lib/group-projects-by-customer';
import type { ApiProject } from '@/lib/projects-api';

type ActivityProjectPickerProps = {
  projects: ApiProject[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
};

function customerSelectionState(projectIds: string[], selectedIds: string[]) {
  const selectedCount = projectIds.filter((id) => selectedIds.includes(id)).length;
  if (selectedCount === 0) return 'none' as const;
  if (selectedCount === projectIds.length) return 'all' as const;
  return 'partial' as const;
}

function projectMatchesQuery(project: ApiProject, query: string) {
  const haystack = [
    project.name,
    project.developer,
    project.city,
    project.country,
    project.stage,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function ActivityProjectPicker({ projects, selectedIds, onChange }: ActivityProjectPickerProps) {
  const [search, setSearch] = useState('');
  const groups = useMemo(() => groupProjectsByCustomer(projects), [projects]);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const normalizedSearch = search.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) return groups;
    return groups
      .map((group) => {
        const customerMatches = group.customer.toLowerCase().includes(normalizedSearch);
        const matchingProjects = group.projects.filter((project) =>
          projectMatchesQuery(project, normalizedSearch)
        );
        if (customerMatches) return group;
        if (matchingProjects.length === 0) return null;
        return { ...group, projects: matchingProjects };
      })
      .filter((group): group is (typeof groups)[number] => group !== null);
  }, [groups, normalizedSearch]);

  useEffect(() => {
    if (!normalizedSearch) return;
    setExpandedCustomers((prev) => {
      const next = { ...prev };
      for (const group of filteredGroups) {
        next[group.customer] = true;
      }
      return next;
    });
  }, [normalizedSearch, filteredGroups]);

  function toggleCustomerExpanded(customer: string) {
    setExpandedCustomers((prev) => ({ ...prev, [customer]: !prev[customer] }));
  }

  function toggleProject(projectId: string) {
    onChange(
      selectedIds.includes(projectId)
        ? selectedIds.filter((id) => id !== projectId)
        : [...selectedIds, projectId]
    );
  }

  function toggleCustomerProjects(projectIds: string[], checked: boolean) {
    if (checked) {
      onChange([...new Set([...selectedIds, ...projectIds])]);
      return;
    }
    onChange(selectedIds.filter((id) => !projectIds.includes(id)));
  }

  if (groups.length === 0) {
    return <p className="text-xs text-3">No projects available.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-3" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects or customers..."
          className="h-9 w-full rounded-xl border border-transparent bg-[var(--surface-2)] pl-9 pr-8 text-sm focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-3 hover:bg-[var(--surface)]"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className="max-h-[min(48vh,380px)] space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
        {filteredGroups.length === 0 ? (
          <p className="px-2 py-3 text-xs text-3">No projects match your search.</p>
        ) : (
          filteredGroups.map((group) => {
            const projectIds = group.projects.map((project) => project.id);
            const selection = customerSelectionState(projectIds, selectedIds);
            const expanded = normalizedSearch ? true : Boolean(expandedCustomers[group.customer]);

            return (
              <div key={group.customer} className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-2 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => toggleCustomerExpanded(group.customer)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-3 hover:bg-[var(--surface-2)]"
                    aria-label={expanded ? 'Collapse projects' : 'Expand projects'}
                  >
                    {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selection === 'all'}
                      ref={(input) => {
                        if (input) input.indeterminate = selection === 'partial';
                      }}
                      onChange={(event) => toggleCustomerProjects(projectIds, event.target.checked)}
                      className="h-4 w-4 rounded border-[var(--border-strong)]"
                    />
                    <span className="truncate text-sm font-semibold">{group.customer}</span>
                    <span className="shrink-0 text-[11px] text-3">
                      {group.projects.length} project{group.projects.length === 1 ? '' : 's'}
                    </span>
                  </label>
                </div>
                {expanded && (
                  <div className="space-y-1 border-t border-[var(--border)] px-2 py-2">
                    {group.projects.map((project) => (
                      <label
                        key={project.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface-2)]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(project.id)}
                          onChange={() => toggleProject(project.id)}
                          className="mt-0.5 h-4 w-4 rounded border-[var(--border-strong)]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm">{project.name}</span>
                          <span className="block truncate text-[11px] text-3">
                            {project.city}
                            {project.stage ? ` · ${project.stage}` : ''}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
