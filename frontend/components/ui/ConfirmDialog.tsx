'use client';

import { Button } from '@/components/ui/Button';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm p-4 flex items-center justify-center"
      onClick={loading ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md surface border border-[var(--border)] rounded-2xl shadow-card p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="text-sm font-semibold tracking-tight">
          {title}
        </h3>
        <p id="confirm-dialog-description" className="text-sm text-3 mt-2">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            className={destructive ? 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800' : undefined}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
