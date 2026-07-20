'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

import { ActivityProjectPicker } from '@/components/activity/ActivityProjectPicker';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { listProjects, type ApiProject } from '@/lib/projects-api';

export function QuickActivityFab() {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = useAuth();
  const [openActivityPicker, setOpenActivityPicker] = useState(false);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const projectIdFromPath = useMemo(() => {
    const match = pathname?.match(/^\/projects\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [pathname]);

  useEffect(() => {
    function onComposer(event: Event) {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setComposerOpen(Boolean(detail?.open));
    }
    window.addEventListener('project:activity-composer', onComposer as EventListener);
    return () => {
      window.removeEventListener('project:activity-composer', onComposer as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!openActivityPicker || !token) return;
    let cancelled = false;
    setLoadingProjects(true);
    setPickerError(null);
    void listProjects(token)
      .then((items) => {
        if (cancelled) return;
        setProjects(items);
        setSelectedProjectIds([]);
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
    setOpenActivityPicker(false);
    setPickerError(null);
  }

  function onQuickAddClick() {
    if (projectIdFromPath) {
      window.dispatchEvent(
        new CustomEvent('project:open-activity-composer', {
          detail: { projectId: projectIdFromPath },
        }),
      );
      return;
    }
    setOpenActivityPicker(true);
  }

  function openComposerForSelectedProjects() {
    if (selectedProjectIds.length === 0) {
      setPickerError('Select at least one project to continue.');
      return;
    }
    const [firstProjectId, ...restProjectIds] = selectedProjectIds;
    const projectIdsQuery =
      restProjectIds.length > 0
        ? `&projectIds=${encodeURIComponent(selectedProjectIds.join(','))}`
        : '';
    setOpenActivityPicker(false);
    router.push(`/projects/${firstProjectId}?composeActivity=1${projectIdsQuery}`);
  }

  return (
    <>
      {openActivityPicker && (
        <div className="fixed inset-0 z-[75] bg-black/45 px-4 py-6 sm:p-8" onClick={closeAll}>
          <div
            className="mx-auto w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold tracking-tight">Log activity</p>
                <p className="text-xs text-3">Select one or more projects grouped by customer.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeAll}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-3 p-4">
              {loadingProjects ? (
                <p className="text-xs text-3">Loading projects...</p>
              ) : (
                <ActivityProjectPicker
                  projects={projects}
                  selectedIds={selectedProjectIds}
                  onChange={setSelectedProjectIds}
                />
              )}
              {selectedProjectIds.length > 0 && (
                <p className="text-xs text-3">
                  {selectedProjectIds.length} project{selectedProjectIds.length === 1 ? '' : 's'} selected
                </p>
              )}
              {pickerError && <p className="text-xs text-rose-600">{pickerError}</p>}
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={closeAll}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={openComposerForSelectedProjects}
                  disabled={loadingProjects || selectedProjectIds.length === 0}
                >
                  {loadingProjects ? 'Loading...' : 'Continue'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!composerOpen && !openActivityPicker && (
        <button
          type="button"
          onClick={onQuickAddClick}
          className="fixed bottom-36 right-4 z-[66] inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-brand transition-colors hover:bg-emerald-700"
          aria-label="Log activity"
          title="Log activity"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
