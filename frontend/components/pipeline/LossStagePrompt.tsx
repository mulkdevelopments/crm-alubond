'use client';

import { Button } from '@/components/ui/Button';

export type LossPromptState = {
  reason: string;
  winner: string;
  error: string | null;
  saving: boolean;
};

export function createLossPromptState(seed?: { lossReason?: string | null; competitor?: string | null }): LossPromptState {
  return {
    reason: seed?.lossReason?.trim() ?? '',
    winner: seed?.competitor?.trim() ?? '',
    error: null,
    saving: false,
  };
}

export function LossStagePrompt({
  prompt,
  onChange,
  onClose,
  onSubmit,
}: {
  prompt: LossPromptState;
  onChange: (next: LossPromptState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-lg surface border border-[var(--border)] rounded-2xl shadow-card p-4">
        <h2 className="text-base font-semibold tracking-tight">Mark project as lost</h2>
        <p className="mt-1 text-sm text-2">Tell us why this project was lost and who won, if known.</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-2">Loss reason *</span>
            <textarea
              value={prompt.reason}
              onChange={(event) => onChange({ ...prompt, reason: event.target.value, error: null })}
              rows={3}
              placeholder="What caused us to lose this project?"
              className="mt-1 w-full rounded-xl border border-transparent bg-[var(--surface-2)] px-3 py-2 text-sm focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-2">Who won the project (optional)</span>
            <input
              value={prompt.winner}
              onChange={(event) => onChange({ ...prompt, winner: event.target.value, error: null })}
              placeholder="e.g. Reynobond, Alucobond"
              className="mt-1 h-10 w-full rounded-xl border border-transparent bg-[var(--surface-2)] px-3 text-sm focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none"
            />
          </label>

          {prompt.error ? <p className="text-xs text-rose-600">{prompt.error}</p> : null}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={prompt.saving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onSubmit} disabled={prompt.saving}>
            {prompt.saving ? 'Saving...' : 'Save and move to Lost'}
          </Button>
        </div>
      </div>
    </div>
  );
}
