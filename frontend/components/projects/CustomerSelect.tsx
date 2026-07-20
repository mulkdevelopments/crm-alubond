'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { createCustomer, renameCustomer, trashCustomer } from '@/lib/customers-api';
import { cn } from '@/lib/utils';

function normalizeCustomerKey(value: string) {
  return value.trim().toLowerCase();
}

export function CustomerSelect({
  value,
  options,
  required = false,
  disabled = false,
  canManage = false,
  token = null,
  className,
  onChange,
  onCustomerAdded,
  onCatalogChanged,
  onLocalRename,
  onLocalRemove,
  isPersistedCustomer,
}: {
  value: string;
  options: string[];
  required?: boolean;
  disabled?: boolean;
  canManage?: boolean;
  token?: string | null;
  className?: string;
  onChange: (value: string) => void;
  /** Called with the canonical new name after a successful add. */
  onCustomerAdded: (name: string) => void;
  /** Refresh parent project/customer lists after rename/trash. */
  onCatalogChanged?: () => void | Promise<void>;
  /** Rename a session-only customer that is not yet in the catalog. */
  onLocalRename?: (from: string, to: string) => void;
  /** Remove a session-only customer that is not yet in the catalog. */
  onLocalRemove?: (name: string) => void;
  /** True when the customer exists in the catalog (use API for rename/trash). */
  isPersistedCustomer?: (name: string) => boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [trashTarget, setTrashTarget] = useState<string | null>(null);
  const [trashError, setTrashError] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!editingName) return;
    const frame = window.requestAnimationFrame(() => editInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [editingName]);

  function closeAdd() {
    setAdding(false);
    setDraft('');
    setAddError(null);
  }

  function closeEdit() {
    setEditingName(null);
    setEditDraft('');
    setEditError(null);
  }

  function closeTrash() {
    setTrashTarget(null);
    setTrashError(null);
  }

  async function submitAdd() {
    const name = draft.trim();
    if (!name) {
      setAddError('Enter a customer name.');
      return;
    }
    const key = normalizeCustomerKey(name);
    const existing = options.find((option) => normalizeCustomerKey(option) === key);
    if (existing) {
      setAddError(`“${existing}” already exists.`);
      return;
    }

    setBusy(true);
    setAddError(null);
    try {
      if (token) {
        const created = await createCustomer(token, name);
        await onCatalogChanged?.();
        onCustomerAdded(created.name);
        onChange(created.name);
      } else {
        onCustomerAdded(name);
        onChange(name);
      }
      closeAdd();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Failed to add customer.');
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit() {
    if (!editingName || !canManage) return;
    const next = editDraft.trim();
    if (!next) {
      setEditError('Enter a customer name.');
      return;
    }
    if (normalizeCustomerKey(next) === normalizeCustomerKey(editingName)) {
      setEditError('New name must be different.');
      return;
    }
    const conflict = options.find(
      (option) =>
        normalizeCustomerKey(option) === normalizeCustomerKey(next) &&
        normalizeCustomerKey(option) !== normalizeCustomerKey(editingName),
    );
    if (conflict) {
      setEditError(`“${conflict}” already exists.`);
      return;
    }

    const persisted = isPersistedCustomer?.(editingName) ?? Boolean(token);
    setBusy(true);
    setEditError(null);
    try {
      if (persisted) {
        if (!token) throw new Error('Session missing.');
        await renameCustomer(token, editingName, next);
        await onCatalogChanged?.();
      } else {
        onLocalRename?.(editingName, next);
      }
      if (normalizeCustomerKey(value) === normalizeCustomerKey(editingName)) {
        onChange(next);
      }
      closeEdit();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to rename customer.');
    } finally {
      setBusy(false);
    }
  }

  async function submitTrash() {
    if (!trashTarget || !canManage) return;
    const persisted = isPersistedCustomer?.(trashTarget) ?? Boolean(token);
    setBusy(true);
    setTrashError(null);
    try {
      if (persisted) {
        if (!token) throw new Error('Session missing.');
        await trashCustomer(token, trashTarget);
        await onCatalogChanged?.();
      } else {
        onLocalRemove?.(trashTarget);
      }
      if (normalizeCustomerKey(value) === normalizeCustomerKey(trashTarget)) {
        onChange('');
      }
      closeTrash();
    } catch (error) {
      setTrashError(error instanceof Error ? error.message : 'Failed to move customer to trash.');
    } finally {
      setBusy(false);
    }
  }

  const actionModal =
    mounted && (editingName || trashTarget)
      ? createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
            onClick={() => {
              if (busy) return;
              if (editingName) closeEdit();
              if (trashTarget) closeTrash();
            }}
          >
            <div
              className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl p-4 space-y-3"
              onClick={(event) => event.stopPropagation()}
            >
              {editingName ? (
                <>
                  <div>
                    <h3 className="text-sm font-semibold">Edit customer</h3>
                    <p className="text-xs text-3 mt-1">
                      Renames “{editingName}” on all projects.
                    </p>
                  </div>
                  <input
                    ref={editInputRef}
                    value={editDraft}
                    onChange={(event) => {
                      setEditDraft(event.target.value);
                      setEditError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void submitEdit();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        closeEdit();
                      }
                    }}
                    placeholder="Customer name"
                    disabled={busy}
                    className="h-10 w-full px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--surface)] disabled:opacity-50"
                  />
                  {editError ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{editError}</p>
                  ) : null}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeEdit}
                      disabled={busy}
                      className="h-9 px-3 rounded-lg border border-[var(--border)] text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitEdit()}
                      disabled={busy}
                      className="h-9 px-3 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50"
                    >
                      {busy ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </>
              ) : null}

              {trashTarget ? (
                <>
                  <div>
                    <h3 className="text-sm font-semibold">Move to trash</h3>
                    <p className="text-xs text-3 mt-1">
                      {isPersistedCustomer?.(trashTarget)
                        ? `Move “${trashTarget}” to trash? Projects keep this name; you can restore from Trash. Permanent delete is admin-only.`
                        : `Remove “${trashTarget}” from the customer list?`}
                    </p>
                  </div>
                  {trashError ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{trashError}</p>
                  ) : null}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeTrash}
                      disabled={busy}
                      className="h-9 px-3 rounded-lg border border-[var(--border)] text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitTrash()}
                      disabled={busy}
                      className="h-9 px-3 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
                    >
                      {busy ? 'Moving…' : 'Move to trash'}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <SearchableSelect
          className="min-w-0 flex-1"
          value={value}
          options={options}
          placeholder="Select customer"
          searchPlaceholder="Search customer…"
          required={required}
          disabled={disabled || busy}
          emptyMessage="No customers yet — add one"
          onChange={onChange}
          renderOptionActions={
            canManage
              ? (option, { close }) => (
                  <>
                    <button
                      type="button"
                      className="h-7 w-7 rounded-md inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface)]"
                      title={`Edit ${option}`}
                      aria-label={`Edit ${option}`}
                      onClick={() => {
                        close();
                        setAdding(false);
                        setTrashTarget(null);
                        setEditingName(option);
                        setEditDraft(option);
                        setEditError(null);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="h-7 w-7 rounded-md inline-flex items-center justify-center text-3 hover:text-rose-600 hover:bg-rose-500/10"
                      title={`Move ${option} to trash`}
                      aria-label={`Move ${option} to trash`}
                      onClick={() => {
                        close();
                        setAdding(false);
                        setEditingName(null);
                        setTrashTarget(option);
                        setTrashError(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )
              : undefined
          }
        />
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => {
            setEditingName(null);
            setTrashTarget(null);
            setAdding((prev) => !prev);
            setDraft('');
            setAddError(null);
          }}
          className={cn(
            'h-10 w-10 shrink-0 rounded-xl border inline-flex items-center justify-center transition-colors',
            adding
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-[var(--surface-2)] text-2 border-[var(--border)] hover:bg-[var(--surface)]',
            (disabled || busy) && 'opacity-50 cursor-not-allowed',
          )}
          aria-label={adding ? 'Cancel add customer' : 'Add customer'}
          title={adding ? 'Cancel' : 'Add customer'}
        >
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      {adding ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-3 px-0.5">
            New customer
          </p>
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setAddError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submitAdd();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  closeAdd();
                }
              }}
              placeholder="Customer name"
              autoFocus
              disabled={busy}
              className="h-9 flex-1 min-w-0 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--border-strong)] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void submitAdd()}
              disabled={busy}
              className="h-9 px-3 rounded-lg bg-brand-600 text-white text-xs font-semibold shrink-0 hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? 'Adding…' : 'Add'}
            </button>
          </div>
          {addError ? <p className="text-xs text-rose-600 dark:text-rose-400 px-0.5">{addError}</p> : null}
        </div>
      ) : null}

      {actionModal}
    </div>
  );
}

export function isKnownCustomer(name: string, options: string[]) {
  const key = normalizeCustomerKey(name);
  if (!key) return false;
  return options.some((option) => normalizeCustomerKey(option) === key);
}
