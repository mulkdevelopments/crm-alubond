'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, ShieldAlert, X } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthContext';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  createMasterCurrency,
  createMasterRegion,
  listMasterCurrencies,
  listMasterRegions,
  MasterCurrencyItem,
  MasterRegionItem,
  updateMasterCurrency,
  updateMasterRegion,
} from '@/lib/master-data-api';

export default function MasterDataPage() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [regions, setRegions] = useState<MasterRegionItem[]>([]);
  const [currencies, setCurrencies] = useState<MasterCurrencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionCurrency, setNewRegionCurrency] = useState('AED');
  const [editingRegion, setEditingRegion] = useState<MasterRegionItem | null>(null);
  const [editRegionName, setEditRegionName] = useState('');
  const [editRegionCurrency, setEditRegionCurrency] = useState('AED');
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [newCurrencyRate, setNewCurrencyRate] = useState('');
  const [editingCurrency, setEditingCurrency] = useState<MasterCurrencyItem | null>(null);
  const [editCurrencyName, setEditCurrencyName] = useState('');
  const [editCurrencyRate, setEditCurrencyRate] = useState('');

  const activeRegions = useMemo(() => regions.filter((entry) => entry.isActive), [regions]);
  const activeCurrencies = useMemo(() => currencies.filter((entry) => entry.isActive), [currencies]);
  const currencyOptions = useMemo(
    () => (activeCurrencies.length > 0 ? activeCurrencies : currencies),
    [activeCurrencies, currencies],
  );

  async function loadData() {
    if (!token || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const [regionRows, currencyRows] = await Promise.all([
        listMasterRegions(token),
        listMasterCurrencies(token),
      ]);
      setRegions(regionRows);
      setCurrencies(currencyRows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load master data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  async function onCreateRegion(event: FormEvent) {
    event.preventDefault();
    if (!token || !newRegionName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await createMasterRegion(token, {
        name: newRegionName.trim(),
        defaultCurrencyCode: newRegionCurrency,
      });
      setNewRegionName('');
      setNewRegionCurrency('AED');
      await loadData();
      setMessage('Region added.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to add region.');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveRegionEdit(event: FormEvent) {
    event.preventDefault();
    if (!token || !editingRegion || !editRegionName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateMasterRegion(token, editingRegion.id, {
        name: editRegionName.trim(),
        defaultCurrencyCode: editRegionCurrency,
      });
      setEditingRegion(null);
      setEditRegionName('');
      setEditRegionCurrency('AED');
      await loadData();
      setMessage('Region updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update region.');
    } finally {
      setSaving(false);
    }
  }

  async function onToggleRegionActive(region: MasterRegionItem) {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateMasterRegion(token, region.id, { isActive: !region.isActive });
      await loadData();
      setMessage(region.isActive ? 'Region deactivated.' : 'Region activated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update region status.');
    } finally {
      setSaving(false);
    }
  }

  async function onCreateCurrency(event: FormEvent) {
    event.preventDefault();
    if (!token || !newCurrencyCode.trim() || !newCurrencyName.trim()) return;
    const rate = Number(newCurrencyRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      setMessage('FX rate must be a positive number (local units per 1 AED).');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await createMasterCurrency(token, {
        code: newCurrencyCode.trim().toUpperCase(),
        name: newCurrencyName.trim(),
        rateToAed: rate,
      });
      setNewCurrencyCode('');
      setNewCurrencyName('');
      setNewCurrencyRate('');
      await loadData();
      setMessage('Currency added.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to add currency.');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveCurrencyEdit(event: FormEvent) {
    event.preventDefault();
    if (!token || !editingCurrency || !editCurrencyName.trim()) return;
    const rate = Number(editCurrencyRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      setMessage('FX rate must be a positive number (local units per 1 AED).');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateMasterCurrency(token, editingCurrency.id, {
        name: editCurrencyName.trim(),
        rateToAed: rate,
      });
      setEditingCurrency(null);
      setEditCurrencyName('');
      setEditCurrencyRate('');
      await loadData();
      setMessage('Currency updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update currency.');
    } finally {
      setSaving(false);
    }
  }

  async function onToggleCurrencyActive(currency: MasterCurrencyItem) {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateMasterCurrency(token, currency.id, { isActive: !currency.isActive });
      await loadData();
      setMessage(currency.isActive ? 'Currency deactivated.' : 'Currency activated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update currency status.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Master Data" subtitle="Admin only" />
        <Card className="p-6 flex items-start gap-3 text-sm text-3">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <p>You need admin access to manage master data.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Master Data"
        subtitle="Operating regions, default currencies, and FX rates used across projects."
      />

      <Card>
        <CardHeader
          title="Currencies & FX rates"
          subtitle={`${activeCurrencies.length} active currency${activeCurrencies.length === 1 ? '' : 'ies'}. Rates are local units per 1 AED; locked when a project is saved.`}
        />
        <div className="p-4 space-y-4">
          <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" onSubmit={onCreateCurrency}>
            <input
              value={newCurrencyCode}
              onChange={(event) => setNewCurrencyCode(event.target.value.toUpperCase())}
              placeholder="Code (e.g. SAR)"
              maxLength={3}
              className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm uppercase"
              required
            />
            <input
              value={newCurrencyName}
              onChange={(event) => setNewCurrencyName(event.target.value)}
              placeholder="Currency name"
              className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
              required
            />
            <input
              value={newCurrencyRate}
              onChange={(event) => setNewCurrencyRate(event.target.value)}
              placeholder="Rate to AED (e.g. 1.02)"
              type="number"
              min={0.000001}
              step="any"
              className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
              required
            />
            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4" />
              Add currency
            </Button>
          </form>

          {loading ? (
            <p className="text-sm text-3">Loading currencies…</p>
          ) : currencies.length === 0 ? (
            <p className="text-sm text-3">No currencies yet. Add your first currency above.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-2)] text-left text-3">
                  <tr>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Rate to AED</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map((currency) => (
                    <tr key={currency.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-3 font-semibold">{currency.code}</td>
                      <td className="px-3 py-3">{currency.name}</td>
                      <td className="px-3 py-3 num-tabular">{currency.rateToAed.toLocaleString('en', { maximumFractionDigits: 6 })}</td>
                      <td className="px-3 py-3">
                        <Badge tone={currency.isActive ? 'success' : 'neutral'}>
                          {currency.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingCurrency(currency);
                              setEditCurrencyName(currency.name);
                              setEditCurrencyRate(String(currency.rateToAed));
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit rate
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={saving || currency.code === 'AED'}
                            onClick={() => void onToggleCurrencyActive(currency)}
                          >
                            {currency.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Operating regions"
          subtitle={`${activeRegions.length} active region${activeRegions.length === 1 ? '' : 's'} available in user forms.`}
        />
        <div className="p-4 space-y-4">
          <form className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px_auto] gap-2" onSubmit={onCreateRegion}>
            <input
              value={newRegionName}
              onChange={(event) => setNewRegionName(event.target.value)}
              placeholder="New region name"
              className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
              required
            />
            <select
              value={newRegionCurrency}
              onChange={(event) => setNewRegionCurrency(event.target.value)}
              className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
            >
              {currencyOptions.map((currency) => (
                <option key={currency.id} value={currency.code}>
                  {currency.code}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4" />
              Add region
            </Button>
          </form>

          {loading ? (
            <p className="text-sm text-3">Loading regions…</p>
          ) : regions.length === 0 ? (
            <p className="text-sm text-3">No regions yet. Add your first operating region above.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-2)] text-left text-3">
                  <tr>
                    <th className="px-3 py-2 font-medium">Region</th>
                    <th className="px-3 py-2 font-medium">Default currency</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region) => (
                    <tr key={region.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-3 font-medium">{region.name}</td>
                      <td className="px-3 py-3">{region.defaultCurrencyCode}</td>
                      <td className="px-3 py-3">
                        <Badge tone={region.isActive ? 'success' : 'neutral'}>
                          {region.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingRegion(region);
                              setEditRegionName(region.name);
                              setEditRegionCurrency(region.defaultCurrencyCode);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={saving}
                            onClick={() => void onToggleRegionActive(region)}
                          >
                            {region.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-3">
            User forms on the{' '}
            <Link href="/users" className="underline underline-offset-2">
              Users
            </Link>{' '}
            page pull location and regional manager assignments from this list. Project forms default currency from the
            region/country mapping.
          </p>
        </div>
      </Card>

      {message && <p className="text-xs text-2">{message}</p>}

      {editingRegion && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-md mx-auto mt-16 surface border border-[var(--border)] rounded-2xl shadow-card">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Edit region</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingRegion(null);
                  setEditRegionName('');
                  setEditRegionCurrency('AED');
                }}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                aria-label="Close edit region dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="p-4 space-y-3" onSubmit={onSaveRegionEdit}>
              <input
                value={editRegionName}
                onChange={(event) => setEditRegionName(event.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                required
              />
              <select
                value={editRegionCurrency}
                onChange={(event) => setEditRegionCurrency(event.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
              >
                {currencyOptions.map((currency) => (
                  <option key={currency.id} value={currency.code}>
                    {currency.code} · {currency.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingRegion(null);
                    setEditRegionName('');
                    setEditRegionCurrency('AED');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCurrency && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-md mx-auto mt-16 surface border border-[var(--border)] rounded-2xl shadow-card">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Edit {editingCurrency.code} FX rate</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingCurrency(null);
                  setEditCurrencyName('');
                  setEditCurrencyRate('');
                }}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                aria-label="Close edit currency dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="p-4 space-y-3" onSubmit={onSaveCurrencyEdit}>
              <input
                value={editCurrencyName}
                onChange={(event) => setEditCurrencyName(event.target.value)}
                placeholder="Currency name"
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                required
              />
              <input
                value={editCurrencyRate}
                onChange={(event) => setEditCurrencyRate(event.target.value)}
                placeholder="Rate to AED"
                type="number"
                min={0.000001}
                step="any"
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                required
              />
              <p className="text-xs text-3">
                Existing projects keep their locked rate. New saves and edits use the current rate.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingCurrency(null);
                    setEditCurrencyName('');
                    setEditCurrencyRate('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
