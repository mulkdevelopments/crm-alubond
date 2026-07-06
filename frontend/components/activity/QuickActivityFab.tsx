'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, ClipboardList, Plus, X } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { listProjects, type ApiProject } from '@/lib/projects-api';

export function QuickActivityFab() {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = useAuth();
  const [openChoice, setOpenChoice] = useState(false);
  const [openActivityPicker, setOpenActivityPicker] = useState(false);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const projectIdFromPath = useMemo(() => {
    const match = pathname?.match(/^\/projects\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [pathname]);

  useEffect(() => {
    if (!openActivityPicker || !token) return;
    let cancelled = false;
    setLoadingProjects(true);
    setPickerError(null);
    void listProjects(token)
      .then((items) => {
        if (cancelled) return;
        setProjects(items);
        setSelectedProjectId((prev) => prev || items[0]?.id || '');
      })
      .catch((err) => {
        if (cancelled) return;
        setPickerError(err instanceof Error ? err.message : 'Failed to load projects.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingProjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openActivityPicker, token]);

  function closeAll() {
    setOpenChoice(false);
    setOpenActivityPicker(false);
    setPickerError(null);
  }

  function onQuickAddClick() {
    setOpenChoice(true);
  }

  function startActivityFlow() {
    setOpenChoice(false);
    if (projectIdFromPath) {
      window.dispatchEvent(
        new CustomEvent('project:open-activity-composer', {
          detail: { projectId: projectIdFromPath },
        })
      );
      return;
    }
    setOpenActivityPicker(true);
  }

  function startProjectFlow() {
    setOpenChoice(false);
    router.push('/pipeline?createProject=1');
  }

  function openComposerForSelectedProject() {
    if (!selectedProjectId) {
      setPickerError('Select a project to continue.');
      return;
    }
    setOpenActivityPicker(false);
    router.push(`/projects/${selectedProjectId}?composeActivity=1`);
  }

  return (
    <>
      {openChoice && (
        <div className="fixed inset-0 z-[75] bg-black/45 px-4 py-6 sm:p-8" onClick={closeAll}>
          <div
            className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold tracking-tight">Quick add</p>
                <p className="text-xs text-3">What would you like to create?</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeAll}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={startProjectFlow}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
                  <Briefcase className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold">Project</p>
                <p className="mt-1 text-xs text-3">Add a new pipeline project.</p>
              </button>
              <button
                type="button"
                onClick={startActivityFlow}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold">Activity</p>
                <p className="mt-1 text-xs text-3">Log a call, visit, note, or update.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {openActivityPicker && (
        <div className="fixed inset-0 z-[75] bg-black/45 px-4 py-6 sm:p-8" onClick={closeAll}>
            <div
              className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold tracking-tight">Log activity</p>
                  <p className="text-xs text-3">Choose a project first.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={closeAll}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-3 p-4">
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  disabled={loadingProjects}
                  className="h-10 w-full rounded-xl border border-transparent bg-[var(--surface-2)] px-3 text-sm focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none"
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {pickerError && <p className="text-xs text-rose-600">{pickerError}</p>}
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={closeAll}>
                    Cancel
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={openComposerForSelectedProject} disabled={loadingProjects}>
                    {loadingProjects ? 'Loading...' : 'Continue'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
      )}

      <button
        type="button"
        onClick={onQuickAddClick}
        className="fixed bottom-36 right-4 z-[66] inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-brand transition-colors hover:bg-emerald-700"
        aria-label="Quick add"
        title="Quick add"
      >
        <Plus className="h-5 w-5" />
      </button>
    </>
  );
}

