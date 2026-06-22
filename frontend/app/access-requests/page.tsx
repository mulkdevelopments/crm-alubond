'use client';

import Link from 'next/link';
import { RotateCcw, Search, ShieldAlert, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth/AuthContext';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  AccessRequestFilter,
  AccessRequestItem,
  deleteAccessRequest,
  dismissAccessRequest,
  listAccessRequests,
  restoreAccessRequest,
} from '@/lib/access-requests-api';
import { cn } from '@/lib/utils';

const FILTERS: Array<{ value: AccessRequestFilter; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'ALL', label: 'All' },
];

function buildCreateUserHref(item: AccessRequestItem) {
  const params = new URLSearchParams({
    create: '1',
    firstName: item.firstName,
    lastName: item.lastName,
    email: item.email,
    accessRequestId: item.id,
  });
  return `/users?${params.toString()}`;
}

export default function AccessRequestsPage() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [filter, setFilter] = useState<AccessRequestFilter>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<AccessRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadData(nextFilter = filter) {
    if (!token || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listAccessRequests(token, nextFilter);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin, filter]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const haystack = `${item.firstName} ${item.lastName} ${item.email} ${item.message}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [items, searchQuery]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'PENDING').length,
    [items],
  );

  async function onDismiss(requestId: string) {
    if (!token) return;
    setActionId(requestId);
    setError(null);
    try {
      await dismissAccessRequest(token, requestId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss request');
    } finally {
      setActionId(null);
    }
  }

  async function onRestore(requestId: string) {
    if (!token) return;
    setActionId(requestId);
    setError(null);
    try {
      await restoreAccessRequest(token, requestId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore request');
    } finally {
      setActionId(null);
    }
  }

  async function onDelete(requestId: string) {
    if (!token) return;
    if (!window.confirm('Delete this access request permanently?')) return;
    setActionId(requestId);
    setError(null);
    try {
      await deleteAccessRequest(token, requestId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete request');
    } finally {
      setActionId(null);
    }
  }

  if (!isAdmin) {
    return (
      <section className="px-4 lg:px-8 py-8">
        <Card className="max-w-xl p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold">Admin access required</h2>
              <p className="text-sm text-2 mt-1">Only admins can review access requests.</p>
            </div>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Access Control"
        title="Access requests"
        subtitle="Review sign-up requests submitted from the login page."
      />

      <section className="px-4 lg:px-8 pb-8 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === value
                    ? 'border-brand-600 bg-brand-600/10 text-brand-700'
                    : 'border-[var(--border)] text-2 hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-3" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name, email, or message"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm placeholder:text-3 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <Card>
          <CardHeader
            title="Incoming requests"
            subtitle={
              searchQuery.trim()
                ? `${filteredItems.length} of ${items.length} shown`
                : filter === 'PENDING'
                  ? `${pendingCount} pending`
                  : `${items.length} shown`
            }
          />

          {loading ? (
            <p className="px-4 pb-4 text-sm text-3">Loading access requests...</p>
          ) : filteredItems.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-3">
              {searchQuery.trim() ? 'No access requests match your search.' : 'No access requests in this view.'}
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredItems.map((item) => {
                const fullName = `${item.firstName} ${item.lastName}`.trim();
                const busy = actionId === item.id;
                return (
                  <div key={item.id} className="px-4 py-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-tight">{fullName || item.email}</p>
                        <Badge tone={item.status === 'PENDING' ? 'warning' : 'neutral'}>
                          {item.status === 'PENDING' ? 'Pending' : 'Dismissed'}
                        </Badge>
                      </div>
                      <p className="text-sm text-2">{item.email}</p>
                      {item.message ? (
                        <p className="text-sm text-3 whitespace-pre-wrap">{item.message}</p>
                      ) : (
                        <p className="text-sm text-3 italic">No message provided.</p>
                      )}
                      <p className="text-xs text-3">
                        Submitted {new Date(item.createdAt).toLocaleString('en-AE')}
                        {item.reviewedAt
                          ? ` · Reviewed ${new Date(item.reviewedAt).toLocaleString('en-AE')}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {item.status === 'PENDING' ? (
                        <>
                          <Link
                            href={buildCreateUserHref(item)}
                            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs rounded-xl font-medium transition-all bg-brand-600 text-white hover:bg-brand-700"
                          >
                            <UserPlus className="h-4 w-4" />
                            Create user
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={<X className="h-4 w-4" />}
                            disabled={busy}
                            onClick={() => void onDismiss(item.id)}
                          >
                            {busy ? 'Dismissing...' : 'Dismiss'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={<RotateCcw className="h-4 w-4" />}
                          disabled={busy}
                          onClick={() => void onRestore(item.id)}
                        >
                          {busy ? 'Restoring...' : 'Restore'}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="h-4 w-4" />}
                        disabled={busy}
                        onClick={() => void onDelete(item.id)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </>
  );
}
