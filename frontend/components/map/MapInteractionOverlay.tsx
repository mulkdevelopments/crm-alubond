'use client';

import { Hand } from 'lucide-react';

import { cn } from '@/lib/utils';

export function MapInteractionOverlay({
  visible,
  active,
  onActivate,
  onDeactivate,
  className,
}: {
  visible: boolean;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  className?: string;
}) {
  if (!visible) return null;

  if (!active) {
    return (
      <button
        type="button"
        aria-label="Enable map interaction"
        onClick={onActivate}
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface)]/35 backdrop-blur-[1px]',
          className,
        )}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium shadow-soft">
          <Hand className="h-4 w-4" />
          Tap to use map
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onDeactivate}
      className={cn(
        'absolute bottom-3 left-3 z-30 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium shadow-soft',
        className,
      )}
    >
      Lock map
    </button>
  );
}
