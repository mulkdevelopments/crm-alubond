'use client';

import { useEffect, useState } from 'react';
import { Building2, FolderKanban, RotateCcw, Trash2 } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthContext';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  listTrashedCustomers,
  permanentlyDeleteCustomer,
  restoreCustomer,
  type CustomerListItem,
} from '@/lib/customers-api';
import {
  listTrashedProjects,
  permanentlyDeleteProject,
  restoreProject,
  type ApiProject,
} from '@/lib/projects-api';
import { cn, formatProjectValue } from '@/lib/utils';

type TrashTab = 'projects' | 'customers';
type HardDeleteTarget =
  | { kind: 'project'; item: ApiProject }
  | { kind: 'customer'; item: CustomerListItem };

export default function TrashPage() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState<TrashTab>('projects');
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<HardDeleteTarget | null>(null);
  const [hardDeleting, setHardDeleting] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [projectRows, customerRows] = await Promise.all([
        listTrashedProjects(token),
        listTrashedCustomers(token),
      ]);
      setProjects(projectRows);
      setCustomers(customerRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trash');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onRestoreProject(project: ApiProject) {
    if (!token) return;
    setBusyId(project.id);
    setError(null);
    try {
      await restoreProject(token, project.id);
      setProjects((prev) => prev.filter((item) => item.id !== project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore project');
    } finally {
      setBusyId(null);
    }
  }

  async function onRestoreCustomer(customer: CustomerListItem) {
    if (!token) return;
    setBusyId(customer.id);
    setError(null);
    try {
      await restoreCustomer(token, customer.id);
      setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore customer');
    } finally {
      setBusyId(null);
    }
  }

  async function onHardDelete() {
    if (!token || !hardDeleteTarget || !isAdmin) return;
    setHardDeleting(true);
    setError(null);
    try {
      if (hardDeleteTarget.kind === 'project') {
        await permanentlyDeleteProject(token, hardDeleteTarget.item.id);
        setProjects((prev) => prev.filter((item) => item.id !== hardDeleteTarget.item.id));
      } else {
        await permanentlyDeleteCustomer(token, hardDeleteTarget.item.id);
        setCustomers((prev) => prev.filter((item) => item.id !== hardDeleteTarget.item.id));
      }
      setHardDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to permanently delete');
    } finally {
      setHardDeleting(false);
    }
  }

  const empty =
    tab === 'projects' ? projects.length === 0 : customers.length === 0;

  return (
    <>
      <PageHeader
        title="Trash"
        subtitle="Soft-deleted projects and customers. Restore anytime — permanent delete is admin-only."
      />

      <section className="px-4 lg:px-8 pb-10">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('projects')}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors',
              tab === 'projects'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-[var(--surface-2)] border-[var(--border)] text-2 hover:bg-[var(--surface)]',
            )}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            Projects ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('customers')}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors',
              tab === 'customers'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-[var(--surface-2)] border-[var(--border)] text-2 hover:bg-[var(--surface)]',
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            Customers ({customers.length})
          </button>
        </div>

        {error ? (
          <p className="mb-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-3">Loading trash…</p>
        ) : empty ? (
          <Card className="p-6">
            <p className="text-sm text-3">
              {tab === 'projects' ? 'No trashed projects.' : 'No trashed customers.'}
            </p>
          </Card>
        ) : tab === 'projects' ? (
          <div className="space-y-3 max-w-3xl">
            {projects.map((project) => (
              <Card key={project.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight truncate">{project.name}</p>
                    <p className="text-xs text-3 mt-0.5">
                      {[project.city, project.country].filter(Boolean).join(', ')}
                      {project.developer ? ` · ${project.developer}` : ''}
                    </p>
                    <p className="text-xs text-3 mt-1">
                      {project.stage} · {formatProjectValue(project, user?.role, true)}
                    </p>
                    <p className="text-[11px] text-3 mt-1">
                      Trashed{' '}
                      {project.deletedAt
                        ? new Date(project.deletedAt).toLocaleString('en-AE', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                      {project.deletedByName ? ` by ${project.deletedByName}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={<RotateCcw className="h-3.5 w-3.5" />}
                      disabled={busyId === project.id || hardDeleting}
                      onClick={() => void onRestoreProject(project)}
                    >
                      Restore
                    </Button>
                    {isAdmin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="text-rose-600 hover:text-rose-700"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        disabled={busyId === project.id || hardDeleting}
                        onClick={() => setHardDeleteTarget({ kind: 'project', item: project })}
                      >
                        Delete forever
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {customers.map((customer) => (
              <Card key={customer.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight truncate">{customer.name}</p>
                    <p className="text-xs text-3 mt-1">
                      {customer.projectCount} active project{customer.projectCount === 1 ? '' : 's'} still reference this name
                    </p>
                    <p className="text-[11px] text-3 mt-1">
                      Trashed{' '}
                      {customer.deletedAt
                        ? new Date(customer.deletedAt).toLocaleString('en-AE', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                      {customer.deletedByName ? ` by ${customer.deletedByName}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={<RotateCcw className="h-3.5 w-3.5" />}
                      disabled={busyId === customer.id || hardDeleting}
                      onClick={() => void onRestoreCustomer(customer)}
                    >
                      Restore
                    </Button>
                    {isAdmin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="text-rose-600 hover:text-rose-700"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        disabled={busyId === customer.id || hardDeleting}
                        onClick={() => setHardDeleteTarget({ kind: 'customer', item: customer })}
                      >
                        Delete forever
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(hardDeleteTarget)}
        title="Delete forever?"
        description={
          hardDeleteTarget?.kind === 'project'
            ? `Permanently delete "${hardDeleteTarget.item.name}"? This removes activities, stakeholders, and follow-ups and cannot be undone.`
            : hardDeleteTarget?.kind === 'customer'
              ? `Permanently delete customer "${hardDeleteTarget.item.name}"? This clears the customer field on matching projects and cannot be undone.`
              : ''
        }
        confirmLabel="Delete forever"
        cancelLabel="Cancel"
        destructive
        loading={hardDeleting}
        onCancel={() => {
          if (hardDeleting) return;
          setHardDeleteTarget(null);
        }}
        onConfirm={() => void onHardDelete()}
      />
    </>
  );
}
