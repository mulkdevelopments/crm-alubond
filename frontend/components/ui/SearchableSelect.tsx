'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

export function SearchableSelect({
  value,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  required = false,
  allowCustom = false,
  emptyMessage = 'No matches',
  className,
  onChange,
  renderOptionActions,
}: {
  value: string;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowCustom?: boolean;
  emptyMessage?: string;
  className?: string;
  onChange: (value: string) => void;
  renderOptionActions?: (option: string, api: { close: () => void }) => ReactNode;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return options.some((option) => option.toLowerCase() === q);
  }, [options, query]);

  function closeMenu() {
    setOpen(false);
    setQuery('');
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function selectValue(next: string) {
    onChange(next);
    closeMenu();
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
          setQuery('');
        }}
        className={cn(
          'h-10 w-full px-3 rounded-xl bg-[var(--surface-2)] border border-transparent text-sm inline-flex items-center gap-2 text-left transition-colors',
          'focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--surface)]',
          open && 'border-[var(--border-strong)] bg-[var(--surface)]',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn('flex-1 truncate', !value && 'text-3')}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-3 transition-transform', open && 'rotate-180')} />
      </button>

      <input
        tabIndex={-1}
        aria-hidden
        required={required}
        value={value}
        onChange={() => undefined}
        className="sr-only"
      />

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[var(--border)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-3" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-[var(--surface-2)] border border-transparent text-sm focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--surface)]"
              />
            </div>
          </div>

          <ul id={listId} role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.map((option) => {
              const selected = option === value;
              return (
                <li key={option} role="option" aria-selected={selected}>
                  <div
                    className={cn(
                      'w-full px-2 py-1.5 text-sm inline-flex items-center gap-1 hover:bg-[var(--surface-2)]',
                      selected && 'bg-brand-600/10 text-brand-600 font-medium',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectValue(option)}
                      className="flex-1 min-w-0 px-1 py-1 text-left inline-flex items-center gap-2"
                    >
                      <span className="flex-1 truncate">{option}</span>
                      {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                    </button>
                    {renderOptionActions ? (
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        {renderOptionActions(option, { close: closeMenu })}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}

            {filtered.length === 0 && !(allowCustom && query.trim()) ? (
              <li className="px-3 py-2 text-xs text-3">{emptyMessage}</li>
            ) : null}

            {allowCustom && query.trim() && !exactMatch ? (
              <li role="option">
                <button
                  type="button"
                  onClick={() => selectValue(query.trim())}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                >
                  Use “{query.trim()}”
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
