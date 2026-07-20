'use client';

import { Button } from '@/components/ui/Button';

export type ConverterOption = {
  id: string;
  name: string;
  roleLabel: string;
};

export type WinPromptState = {
  convertedById: string;
  error: string | null;
  saving: boolean;
};

export function createWinPromptState(seed?: { convertedById?: string | null }): WinPromptState {
  return {
    convertedById: seed?.convertedById?.trim() ?? '',
    error: null,
    saving: false,
  };
}

export function buildConverterOptions(project: {
  salesRepIds: string[];
  salesRepNames: string[];
  managerId: string | null;
  managerName: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
}): ConverterOption[] {
  const options: ConverterOption[] = [];
  const seen = new Set<string>();

  project.salesRepIds.forEach((id, index) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    options.push({
      id,
      name: project.salesRepNames[index]?.trim() || 'Sales rep',
      roleLabel: 'Sales rep',
    });
  });

  if (project.managerId && !seen.has(project.managerId)) {
    seen.add(project.managerId);
    options.push({
      id: project.managerId,
      name: project.managerName.trim() || 'Manager',
      roleLabel: 'Manager',
    });
  }

  if (project.regionalManagerId && !seen.has(project.regionalManagerId)) {
    seen.add(project.regionalManagerId);
    options.push({
      id: project.regionalManagerId,
      name: project.regionalManagerName.trim() || 'Regional manager',
      roleLabel: 'Regional manager',
    });
  }

  return options;
}

export function WinStagePrompt({
  prompt,
  options,
  onChange,
  onClose,
  onSubmit,
}: {
  prompt: WinPromptState;
  options: ConverterOption[];
  onChange: (next: WinPromptState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-lg surface border border-[var(--border)] rounded-2xl shadow-card p-4">
        <h2 className="text-base font-semibold tracking-tight">Who converted this project?</h2>
        <p className="mt-1 text-sm text-2">
          Pick the person who gets the win on Field Team. Credit goes to one person only.
        </p>

        <div className="mt-4 space-y-2">
          {options.length === 0 ? (
            <p className="text-sm text-rose-600">
              Assign at least one sales rep, manager, or regional manager before marking Won.
            </p>
          ) : (
            options.map((option) => {
              const selected = prompt.convertedById === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange({ ...prompt, convertedById: option.id, error: null })}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    selected
                      ? 'border-brand-600 bg-brand-600/10'
                      : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-brand-600/40'
                  }`}
                >
                  <p className="text-sm font-semibold">{option.name}</p>
                  <p className="text-[11px] text-3 mt-0.5">{option.roleLabel}</p>
                </button>
              );
            })
          )}

          {prompt.error ? <p className="text-xs text-rose-600">{prompt.error}</p> : null}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={prompt.saving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSubmit}
            disabled={prompt.saving || options.length === 0}
          >
            {prompt.saving ? 'Saving...' : 'Save and move to Won'}
          </Button>
        </div>
      </div>
    </div>
  );
}
