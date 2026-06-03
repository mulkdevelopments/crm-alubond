'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { listProjects, type ApiProject } from '@/lib/projects-api';

export function QuickActivityFab() {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = useAuth();
  const [openPicker, setOpenPicker] = useState(false);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const projectIdFromPath = useMemo(() => {
    const match = pathname?.match(/^\/projects\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [pathname]);

  useEffect(() => {
    if (!openPicker || !token) return;
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
  }, [openPicker, token]);

  function onQuickAddClick() {
    if (projectIdFromPath) {
      window.dispatchEvent(
        new CustomEvent('project:open-activity-composer', {
          detail: { projectId: projectIdFromPath },
        })
      );
      return;
    }
    setOpenPicker(true);
  }

  function openComposerForSelectedProject() {
    if (!selectedProjectId) {
      setPickerError('Select a project to continue.');
      return;
    }
    setOpenPicker(false);
    router.push(`/projects/${selectedProjectId}?composeActivity=1`);
  }

  return (
    <>
      {openPicker && (
        <div className="fixed inset-0 z-[75] bg-black/45 px-4 py-6 sm:p-8" onClick={() => setOpenPicker(false)}>
          <div
            className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold tracking-tight">Log activity</p>
                <p className="text-xs text-3">Choose a project first.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpenPicker(false)}>
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
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpenPicker(false)}>
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
        aria-label="Quick add activity"
        title="Quick add activity"
      >
        <Plus className="h-5 w-5" />
      </button>
    </>
  );
}

