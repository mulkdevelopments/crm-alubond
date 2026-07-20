'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapPin, X } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthContext';
import { LocationPickerMap } from '@/components/map/LocationPickerMap';
import { ProjectCommercialFields } from '@/components/projects/ProjectCommercialFields';
import { CustomerSelect, isKnownCustomer } from '@/components/projects/CustomerSelect';
import { StagePicker } from '@/components/projects/StagePicker';
import { buildConverterOptions } from '@/components/pipeline/WinStagePrompt';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  listManagers,
  listMyTeam,
  listRegionalManagers,
  listUsers,
  type TeamMember,
  type UserListItem,
} from '@/lib/auth-api';
import { suggestCurrencyCode } from '@/lib/currency-defaults';
import { STAGES, type Stage } from '@/lib/data';
import {
  citiesForCountry,
  countryOptions,
  normalizeCountryName,
  projectCitiesForCountry,
} from '@/lib/locations';
import { validateLossPrompt } from '@/lib/loss-reasons';
import { listActiveCurrencies, listActiveRegionDefaults, type ActiveCurrencyItem } from '@/lib/master-data-api';
import { listCustomers } from '@/lib/customers-api';
import { canSetBusinessDivision } from '@/lib/permissions';
import {
  commercialSpecsComplete,
  formatProjectSpecs,
} from '@/lib/project-specs';
import {
  listProjects,
  updateProject,
  type ApiProject,
  type ProjectUpsertPayload,
} from '@/lib/projects-api';
import {
  cn,
  effectiveValueLocal,
  formatNumberForInput,
  parseFormattedNumber,
  uniqueCustomerNames,
} from '@/lib/utils';

const BUSINESS_DIVISIONS = ['alubond architecture', 'alubond transport', 'uniqube'] as const;
const PIPELINE_STAGES: Stage[] = [...STAGES, 'Lost', 'Won'];
const PIPELINE_VISIBLE_STAGES = PIPELINE_STAGES.filter((stage) => stage !== 'Approved');
const FIELD =
  'h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full';

type FormState = {
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: '' | (typeof BUSINESS_DIVISIONS)[number];
  value: string;
  currencyCode: string;
  itemQuantity: string;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  lat: string;
  lng: string;
  stage: Stage;
  probability: string;
  competitor: string;
  lossReason: string;
  regionalManagerId: string;
  managerId: string;
  salesRepIds: string[];
  convertedById: string;
};

function stageTitle(stage: Stage) {
  if (stage === 'Tender') return 'Quotation';
  if (stage === 'PO Expected') return 'po awaited';
  if (stage === 'Lost') return 'Loss';
  if (stage === 'Won') return 'Win';
  return stage;
}

function requiresCommercialDetails(stage: Stage) {
  return ['Tender', 'Negotiation', 'Approved', 'PO Expected', 'Won'].includes(stage);
}

function toStage(stage: string): Stage {
  return (PIPELINE_STAGES.includes(stage as Stage) ? stage : 'Lead Identified') as Stage;
}

function normalizeOptionalId(value: string): string | null {
  return value.trim() ? value : null;
}

function formFromProject(project: ApiProject): FormState {
  const stage = toStage(project.stage === 'Approved' ? 'PO Expected' : project.stage);
  return {
    name: project.name,
    city: project.city,
    country: normalizeCountryName(project.country),
    developer: project.developer,
    businessDivision: (project.businessDivision as FormState['businessDivision']) ?? '',
    value: formatNumberForInput(effectiveValueLocal(project)),
    currencyCode: project.currencyCode || 'AED',
    itemQuantity: formatNumberForInput(project.itemQuantity ?? 0),
    specThickness: project.specThickness ?? '',
    specCore: project.specCore ?? '',
    specPaintType: project.specPaintType ?? '',
    lat: String(project.lat ?? ''),
    lng: String(project.lng ?? ''),
    stage,
    probability: String(project.probability ?? ''),
    competitor: project.competitor ?? '',
    lossReason: project.lossReason ?? '',
    regionalManagerId: project.regionalManagerId ?? '',
    managerId: project.managerId ?? '',
    salesRepIds: project.salesRepIds ?? [],
    convertedById: project.convertedById ?? '',
  };
}

export function ProjectFormDialog({
  open,
  project,
  onClose,
  onSaved,
}: {
  open: boolean;
  project: ApiProject;
  onClose: () => void;
  onSaved: (project: ApiProject) => void;
}) {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isRegionalManager = user?.role === 'REGIONAL_MANAGER';
  const isSalesRep = user?.role === 'SALES_REP';
  const canSetDivision = canSetBusinessDivision(user);

  const [form, setForm] = useState<FormState>(() => formFromProject(project));
  const [formError, setFormError] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locationQuery, setLocationQuery] = useState(project.city);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<UserListItem[]>([]);
  const [salesReps, setSalesReps] = useState<UserListItem[]>([]);
  const [knownProjects, setKnownProjects] = useState<ApiProject[]>([]);
  const [catalogCustomers, setCatalogCustomers] = useState<string[]>([]);
  const [extraCustomers, setExtraCustomers] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<ActiveCurrencyItem[]>([]);
  const [regionDefaults, setRegionDefaults] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm(formFromProject(project));
    setFormError(null);
    setLocationQuery(project.city);
    setLocationSearchError(null);
  }, [open, project]);

  useEffect(() => {
    if (!open || !token) return;
    void (async () => {
      try {
        const [currencyRows, regionRows, projectRows, customerRows] = await Promise.all([
          listActiveCurrencies(token),
          listActiveRegionDefaults(token),
          listProjects(token),
          listCustomers(token),
        ]);
        setCurrencies(currencyRows);
        setRegionDefaults(
          Object.fromEntries(regionRows.map((row) => [row.name, row.defaultCurrencyCode])),
        );
        setKnownProjects(projectRows);
        setCatalogCustomers(customerRows.map((row) => row.name));
      } catch {
        setCurrencies([{ code: 'AED', name: 'UAE Dirham', rateToAed: 1 }]);
      }
    })();
  }, [open, token]);

  useEffect(() => {
    if (!open || !token || !user) return;

    async function loadPeople() {
      setPeopleError(null);
      try {
        if (isAdmin || user?.role === 'CEO') {
          const [managerData, regionalManagerData, userData] = await Promise.all([
            listManagers(token!),
            listRegionalManagers(token!),
            listUsers(token!),
          ]);
          const managerUsers = userData.filter((entry) => entry.role === 'MANAGER');
          setManagers(
            managerUsers.length > 0
              ? managerUsers
              : managerData.map((entry) => ({
                  id: entry.id,
                  email: entry.email,
                  firstName: entry.firstName,
                  lastName: entry.lastName,
                  role: 'MANAGER' as const,
                  managerId: null,
                  regionalManagerId: null,
                  reportsToId: null,
                  regions: [],
                  operationLocations: [],
                  yearlyTarget: null,
                  isActive: true,
                  canSetBusinessDivision: false,
                  createdAt: new Date(0).toISOString(),
                  lastLocationPingAt: null,
                  lastSeenAt: null,
                  manager: null,
                  regionalManager: null,
                  reportsTo: null,
                })),
          );
          const regionalManagerUsers = userData.filter((entry) => entry.role === 'REGIONAL_MANAGER');
          setRegionalManagers(
            regionalManagerUsers.length > 0
              ? regionalManagerUsers
              : regionalManagerData.map((entry) => ({
                  id: entry.id,
                  email: entry.email,
                  firstName: entry.firstName,
                  lastName: entry.lastName,
                  role: 'REGIONAL_MANAGER' as const,
                  managerId: null,
                  regionalManagerId: null,
                  reportsToId: null,
                  regions: [],
                  operationLocations: [],
                  yearlyTarget: null,
                  isActive: true,
                  canSetBusinessDivision: false,
                  createdAt: new Date(0).toISOString(),
                  lastLocationPingAt: null,
                  lastSeenAt: null,
                  manager: null,
                  regionalManager: null,
                  reportsTo: null,
                })),
          );
          setSalesReps(userData.filter((entry) => entry.role === 'SALES_REP'));
          return;
        }

        if (isRegionalManager && user) {
          const userData = await listUsers(token!);
          setRegionalManagers(userData.filter((entry) => entry.role === 'REGIONAL_MANAGER' && entry.id === user.id));
          setManagers(userData.filter((entry) => entry.role === 'MANAGER'));
          setSalesReps(userData.filter((entry) => entry.role === 'SALES_REP'));
          return;
        }

        if (isSalesRep && user) {
          const userData = await listUsers(token!);
          setManagers(userData.filter((entry) => entry.role === 'MANAGER'));
          setRegionalManagers(userData.filter((entry) => entry.role === 'REGIONAL_MANAGER'));
          setSalesReps(userData.filter((entry) => entry.role === 'SALES_REP'));
          return;
        }

        if (!isManager || !user) {
          setManagers([]);
          setRegionalManagers([]);
          setSalesReps([]);
          return;
        }

        const teamData: TeamMember[] = await listMyTeam(token!);
        setRegionalManagers(
          user.regionalManagerId
            ? [
                {
                  id: user.regionalManagerId,
                  email: '',
                  firstName: 'Regional',
                  lastName: 'Manager',
                  role: 'REGIONAL_MANAGER',
                  managerId: null,
                  regionalManagerId: null,
                  reportsToId: null,
                  regions: [],
                  operationLocations: [],
                  yearlyTarget: null,
                  isActive: true,
                  canSetBusinessDivision: false,
                  createdAt: new Date(0).toISOString(),
                  lastLocationPingAt: null,
                  lastSeenAt: null,
                  manager: null,
                  regionalManager: null,
                  reportsTo: null,
                },
              ]
            : [],
        );
        setManagers([
          {
            id: user.id,
            email: user.email,
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            role: 'MANAGER',
            managerId: null,
            regionalManagerId: user.regionalManagerId ?? null,
            reportsToId: null,
            regions: user.regions ?? [],
            operationLocations: [],
            yearlyTarget: null,
            isActive: true,
            canSetBusinessDivision: false,
            createdAt: new Date(0).toISOString(),
            lastLocationPingAt: null,
                  lastSeenAt: null,
            manager: null,
            regionalManager: null,
            reportsTo: null,
          },
        ]);
        setSalesReps(
          teamData.map((entry) => ({
            id: entry.id,
            email: entry.email,
            firstName: entry.firstName,
            lastName: entry.lastName,
            role: entry.role,
            managerId: entry.managerId,
            regionalManagerId: user.regionalManagerId ?? null,
            reportsToId: null,
            regions: [],
            operationLocations: [],
            yearlyTarget: null,
            isActive: true,
            canSetBusinessDivision: false,
            createdAt: new Date(0).toISOString(),
            lastLocationPingAt: null,
                  lastSeenAt: null,
            manager: null,
            regionalManager: null,
            reportsTo: null,
          })),
        );
      } catch {
        setPeopleError('Could not load managers/reps for assignment.');
      }
    }

    void loadPeople();
  }, [open, token, user, isAdmin, isManager, isRegionalManager, isSalesRep]);

  const regionalManagerForForm =
    (isRegionalManager && user?.id ? user.id : form.regionalManagerId) || '';
  const managerForForm = (isManager && user?.id ? user.id : form.managerId) || '';
  const selectedManager = managers.find((entry) => entry.id === managerForForm) ?? null;
  const managersForForm = regionalManagerForForm
    ? managers.filter((entry) => entry.regionalManagerId === regionalManagerForForm)
    : managers;
  const repsForSelectedManager = salesReps.filter((rep) => {
    if (managerForForm) {
      if (rep.managerId === managerForForm) return true;
      if (!selectedManager?.regionalManagerId) return false;
      return rep.managerId === null && rep.regionalManagerId === selectedManager.regionalManagerId;
    }
    if (regionalManagerForForm) {
      return rep.managerId === null && rep.regionalManagerId === regionalManagerForForm;
    }
    return true;
  });

  const selectedRegionalManager =
    regionalManagers.find((entry) => entry.id === regionalManagerForForm) ?? null;

  const formConverterOptions = useMemo(
    () =>
      buildConverterOptions({
        salesRepIds: form.salesRepIds,
        salesRepNames: form.salesRepIds.map((id) => {
          const rep = salesReps.find((entry) => entry.id === id);
          return rep ? `${rep.firstName} ${rep.lastName}`.trim() : 'Sales rep';
        }),
        managerId: managerForForm || null,
        managerName: selectedManager
          ? `${selectedManager.firstName} ${selectedManager.lastName}`.trim()
          : '',
        regionalManagerId: regionalManagerForForm || null,
        regionalManagerName: selectedRegionalManager
          ? `${selectedRegionalManager.firstName} ${selectedRegionalManager.lastName}`.trim()
          : '',
      }),
    [
      form.salesRepIds,
      managerForForm,
      regionalManagerForForm,
      salesReps,
      selectedManager,
      selectedRegionalManager,
    ],
  );

  const customerSuggestions = useMemo(
    () =>
      uniqueCustomerNames([
        ...catalogCustomers.map((developer) => ({ developer })),
        ...extraCustomers.map((developer) => ({ developer })),
        ...(form.developer.trim() ? [{ developer: form.developer }] : []),
      ]),
    [catalogCustomers, extraCustomers, form.developer],
  );
  const countryOptionList = useMemo(() => countryOptions(form.country), [form.country]);
  const citySuggestions = useMemo(
    () =>
      citiesForCountry(form.country, {
        existingCity: form.city,
        projectCities: projectCitiesForCountry(knownProjects, form.country),
      }),
    [form.country, form.city, knownProjects],
  );

  function defaultCurrencyForCountry(country: string) {
    return suggestCurrencyCode({ country, regionDefaults });
  }

  function handleCountryChange(nextCountry: string) {
    const countryChanged = normalizeCountryName(form.country) !== normalizeCountryName(nextCountry);
    if (countryChanged) setLocationQuery('');
    setForm((prev) => ({
      ...prev,
      country: nextCountry,
      city: countryChanged ? '' : prev.city,
      currencyCode: defaultCurrencyForCountry(normalizeCountryName(nextCountry) || nextCountry),
    }));
  }

  function handleCityChange(nextCity: string) {
    setForm((prev) => ({ ...prev, city: nextCity }));
    setLocationQuery(nextCity);
  }

  function pickLocationFromMap(lat: number, lng: number) {
    setLocationSearchError(null);
    setForm((prev) => ({
      ...prev,
      lat: lat.toFixed(5),
      lng: lng.toFixed(5),
    }));
  }

  async function searchLocation() {
    const query = locationQuery.trim();
    if (!query) {
      setLocationSearchError('Enter a place to search.');
      return;
    }
    setLocationSearchLoading(true);
    setLocationSearchError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) throw new Error('Location lookup failed');
      const results = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
      const first = results[0];
      if (!first) {
        setLocationSearchError('No location found. Try city, address, or country name.');
        return;
      }
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setLocationSearchError('Location result is invalid.');
        return;
      }
      pickLocationFromMap(lat, lng);
      if (first.display_name) {
        setLocationQuery(first.display_name.split(',')[0] ?? first.display_name);
      }
    } catch {
      setLocationSearchError('Unable to search location right now.');
    } finally {
      setLocationSearchLoading(false);
    }
  }

  function toggleSalesRep(repId: string) {
    setForm((prev) => ({
      ...prev,
      salesRepIds: prev.salesRepIds.includes(repId)
        ? prev.salesRepIds.filter((id) => id !== repId)
        : [...prev.salesRepIds, repId],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setFormError('Session expired. Please login again.');
      return;
    }

    const name = form.name.trim();
    const city = form.city.trim();
    const country = normalizeCountryName(form.country.trim());
    const developer = form.developer.trim();
    const value = parseFormattedNumber(form.value);
    const itemQuantity = parseFormattedNumber(form.itemQuantity);
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const probability = Math.max(0, Math.min(100, Number(form.probability)));

    if (!name || !city || !country) {
      setFormError('Fill project name, country, and city.');
      return;
    }
    if (!developer || !isKnownCustomer(developer, customerSuggestions)) {
      setFormError('Select a customer from the list, or add a new one.');
      return;
    }

    if (requiresCommercialDetails(form.stage)) {
      if (!Number.isFinite(value) || value <= 0) {
        setFormError('Total project value must be greater than 0.');
        return;
      }
      if (!Number.isFinite(itemQuantity) || itemQuantity <= 0) {
        setFormError('Total project quantity must be greater than 0.');
        return;
      }
      if (!commercialSpecsComplete(form.specThickness, form.specCore, form.specPaintType)) {
        setFormError('Select thickness, core, and paint type.');
        return;
      }
    }

    if (form.stage === 'Lost') {
      const lossError = validateLossPrompt({ reason: form.lossReason });
      if (lossError) {
        setFormError(lossError);
        return;
      }
    }

    if (form.stage === 'Won' && !form.convertedById) {
      setFormError('Select who converted this project.');
      return;
    }

    const nextItemName = commercialSpecsComplete(form.specThickness, form.specCore, form.specPaintType)
      ? formatProjectSpecs(form.specThickness, form.specCore, form.specPaintType)
      : project.itemName;

    const payload: ProjectUpsertPayload = {
      name,
      city,
      country,
      developer,
      businessDivision: canSetDivision
        ? form.businessDivision || null
        : project.businessDivision,
      stage: form.stage,
      valueLocal: Number.isFinite(value) && value >= 0 ? value : 0,
      currencyCode: form.currencyCode,
      itemName: nextItemName,
      itemQuantity: Number.isFinite(itemQuantity) && itemQuantity > 0 ? itemQuantity : 0,
      specThickness: form.specThickness,
      specCore: form.specCore,
      specPaintType: form.specPaintType,
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
      probability: form.stage === 'Lost' ? 0 : Number.isFinite(probability) ? probability : 0,
      daysInStage: project.stage === form.stage ? project.daysInStage : 1,
      competitor: form.competitor.trim() || null,
      lossReason: form.stage === 'Lost' ? form.lossReason.trim() : null,
      regionalManagerId:
        isRegionalManager && user?.id ? user.id : normalizeOptionalId(form.regionalManagerId),
      managerId:
        isManager && user?.id
          ? user.id
          : isSalesRep
            ? normalizeOptionalId(user?.managerId ?? form.managerId)
            : normalizeOptionalId(form.managerId),
      salesRepIds:
        isSalesRep && user?.id
          ? form.salesRepIds.length > 0
            ? form.salesRepIds
            : [user.id]
          : form.salesRepIds,
      convertedById: form.stage === 'Won' ? form.convertedById || null : null,
    };

    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateProject(token, project.id, payload);
      onSaved(updated);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to update project.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-[var(--surface)] sm:bg-black/40 sm:backdrop-blur-sm sm:p-4 overflow-hidden">
      <div className="w-full h-full sm:h-[calc(100vh-2rem)] sm:max-w-[min(1400px,100%)] sm:mx-auto sm:rounded-2xl surface sm:border border-[var(--border)] shadow-card flex flex-col overflow-hidden">
        <div className="shrink-0 p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          <h2 className="text-base font-semibold tracking-tight">Edit project</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            aria-label="Close form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden overscroll-contain">
            <div className="grid grid-cols-1 xl:grid-cols-[430px,1fr] xl:h-full xl:min-h-0">
              <div className="p-4 space-y-3 border-b xl:border-b-0 xl:border-r border-[var(--border)] xl:overflow-y-auto xl:min-h-0">
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Project name"
                  required
                  className={FIELD}
                />

                <StagePicker
                  value={form.stage}
                  options={PIPELINE_VISIBLE_STAGES}
                  labelFor={stageTitle}
                  onChange={(stage) => {
                    setFormError(null);
                    setForm((prev) => ({ ...prev, stage }));
                  }}
                />

                <SearchableSelect
                  value={form.country}
                  options={countryOptionList}
                  placeholder="Select country"
                  searchPlaceholder="Search country…"
                  required
                  onChange={(next) => handleCountryChange(normalizeCountryName(next) || next)}
                />
                <SearchableSelect
                  value={form.city}
                  options={citySuggestions}
                  placeholder={form.country.trim() ? 'Select or search city' : 'Select country first'}
                  searchPlaceholder="Search city…"
                  required
                  disabled={!form.country.trim()}
                  allowCustom
                  onChange={handleCityChange}
                />
                <CustomerSelect
                  value={form.developer}
                  options={customerSuggestions}
                  required
                  canManage
                  token={token}
                  onChange={(next) => setForm((prev) => ({ ...prev, developer: next }))}
                  onCustomerAdded={(name) =>
                    setExtraCustomers((prev) =>
                      prev.some((entry) => entry.toLowerCase() === name.toLowerCase())
                        ? prev
                        : [...prev, name],
                    )
                  }
                  isPersistedCustomer={(name) =>
                    catalogCustomers.some(
                      (entry) => entry.trim().toLowerCase() === name.trim().toLowerCase(),
                    )
                  }
                  onLocalRename={(from, to) =>
                    setExtraCustomers((prev) =>
                      prev.map((entry) =>
                        entry.toLowerCase() === from.toLowerCase() ? to : entry,
                      ),
                    )
                  }
                  onLocalRemove={(name) =>
                    setExtraCustomers((prev) =>
                      prev.filter((entry) => entry.toLowerCase() !== name.toLowerCase()),
                    )
                  }
                  onCatalogChanged={async () => {
                    if (!token) return;
                    const [projectRows, customerRows] = await Promise.all([
                      listProjects(token),
                      listCustomers(token),
                    ]);
                    setKnownProjects(projectRows);
                    setCatalogCustomers(customerRows.map((row) => row.name));
                    setForm((prev) => {
                      const match = projectRows.find((row) => row.id === project.id);
                      if (!match) return prev;
                      return { ...prev, developer: match.developer };
                    });
                  }}
                />

                {canSetDivision ? (
                  <select
                    value={form.businessDivision}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        businessDivision: e.target.value as FormState['businessDivision'],
                      }))
                    }
                    className={FIELD}
                  >
                    <option value="">Business division (optional)</option>
                    {BUSINESS_DIVISIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : null}

                {form.stage === 'Lost' ? (
                  <div className="space-y-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-2">Loss reason *</span>
                      <textarea
                        value={form.lossReason}
                        onChange={(e) => {
                          setFormError(null);
                          setForm((prev) => ({ ...prev, lossReason: e.target.value }));
                        }}
                        rows={3}
                        placeholder="What caused us to lose this project?"
                        className="mt-1 w-full rounded-xl border border-transparent bg-[var(--surface-2)] px-3 py-2 text-sm focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-2">Who won the project (optional)</span>
                      <input
                        value={form.competitor}
                        onChange={(e) => setForm((prev) => ({ ...prev, competitor: e.target.value }))}
                        placeholder="e.g. Reynobond, Alucobond"
                        className="mt-1 h-10 w-full rounded-xl border border-transparent bg-[var(--surface-2)] px-3 text-sm focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none"
                      />
                    </label>
                  </div>
                ) : null}

                {form.stage === 'Won' ? (
                  <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <p className="text-xs font-semibold text-2">Who converted this project? *</p>
                    <p className="text-[11px] text-3">This person gets the win credit on Field Team.</p>
                    {formConverterOptions.length === 0 ? (
                      <p className="text-xs text-rose-600">
                        Assign a sales rep, manager, or regional manager first.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {formConverterOptions.map((option) => {
                          const selected = form.convertedById === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setFormError(null);
                                setForm((prev) => ({ ...prev, convertedById: option.id }));
                              }}
                              className={`w-full text-left rounded-lg border px-2.5 py-2 transition-colors ${
                                selected
                                  ? 'border-brand-600 bg-brand-600/10'
                                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-brand-600/40'
                              }`}
                            >
                              <p className="text-sm font-medium">{option.name}</p>
                              <p className="text-[11px] text-3">{option.roleLabel}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                <ProjectCommercialFields
                  idPrefix="project-detail-edit"
                  value={form.value}
                  currencyCode={form.currencyCode}
                  currencies={currencies}
                  itemQuantity={form.itemQuantity}
                  specThickness={form.specThickness}
                  specCore={form.specCore}
                  specPaintType={form.specPaintType}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, value }))}
                  onCurrencyCodeChange={(currencyCode) => setForm((prev) => ({ ...prev, currencyCode }))}
                  onItemQuantityChange={(itemQuantity) => setForm((prev) => ({ ...prev, itemQuantity }))}
                  onSpecThicknessChange={(specThickness) => setForm((prev) => ({ ...prev, specThickness }))}
                  onSpecCoreChange={(specCore) => setForm((prev) => ({ ...prev, specCore }))}
                  onSpecPaintTypeChange={(specPaintType) => setForm((prev) => ({ ...prev, specPaintType }))}
                  required={requiresCommercialDetails(form.stage)}
                  showSpecifications={requiresCommercialDetails(form.stage)}
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={form.lat}
                    onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
                    placeholder="Latitude"
                    className={FIELD}
                  />
                  <input
                    type="number"
                    step="any"
                    value={form.lng}
                    onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
                    placeholder="Longitude"
                    className={FIELD}
                  />
                </div>

                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.probability}
                  onChange={(e) => setForm((prev) => ({ ...prev, probability: e.target.value }))}
                  placeholder="Probability (%)"
                  className={FIELD}
                />

                {form.stage !== 'Lost' ? (
                  <input
                    value={form.competitor}
                    onChange={(e) => setForm((prev) => ({ ...prev, competitor: e.target.value }))}
                    placeholder="Competitor (optional)"
                    className={FIELD}
                  />
                ) : null}

                <select
                  value={regionalManagerForForm}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      regionalManagerId: e.target.value,
                      managerId: isManager ? prev.managerId : '',
                      salesRepIds: [],
                    }))
                  }
                  disabled={isRegionalManager}
                  className={cn(FIELD, isRegionalManager && 'opacity-70 cursor-not-allowed')}
                >
                  <option value="">
                    {isRegionalManager ? 'Your regional profile' : 'Assign regional manager (optional)'}
                  </option>
                  {regionalManagers.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.firstName} {entry.lastName}
                    </option>
                  ))}
                </select>

                <select
                  value={managerForForm}
                  onChange={(e) => setForm((prev) => ({ ...prev, managerId: e.target.value, salesRepIds: [] }))}
                  disabled={isManager}
                  className={cn(FIELD, isManager && 'opacity-70 cursor-not-allowed')}
                >
                  <option value="">{isManager ? 'Your manager profile' : 'Assign manager (optional)'}</option>
                  {managersForForm.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.firstName} {entry.lastName}
                    </option>
                  ))}
                </select>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-xs font-semibold mb-2">Assign sales reps (optional)</p>
                  {repsForSelectedManager.length === 0 ? (
                    <p className="text-xs text-3">No sales reps match the selected regional manager or manager.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5">
                      {repsForSelectedManager.map((rep) => {
                        const checked = form.salesRepIds.includes(rep.id);
                        return (
                          <label
                            key={rep.id}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer border',
                              checked
                                ? 'border-brand-600/50 bg-brand-600/10 text-[var(--text)]'
                                : 'border-[var(--border)] hover:bg-[var(--surface)]',
                            )}
                          >
                            <input
                              type="checkbox"
                              className="accent-brand-600"
                              checked={checked}
                              onChange={() => toggleSalesRep(rep.id)}
                            />
                            <span>
                              {rep.firstName} {rep.lastName}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {peopleError && <p className="text-xs text-rose-600">{peopleError}</p>}
                {formError && <p className="text-xs text-rose-600">{formError}</p>}

                <div className="hidden xl:flex items-center justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </div>

              <div className="p-4 flex flex-col xl:min-h-0">
                <div className="mb-2 flex flex-col sm:flex-row gap-2">
                  <input
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void searchLocation();
                      }
                    }}
                    placeholder="Search place or address"
                    className="h-10 sm:h-9 flex-1 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => void searchLocation()}
                    disabled={locationSearchLoading}
                  >
                    {locationSearchLoading ? 'Searching...' : 'Go'}
                  </Button>
                </div>
                <p className="text-xs text-2 mb-2 inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Tap map or drag marker to set location
                </p>
                <div className="h-[240px] sm:h-[300px] xl:h-auto xl:flex-1 xl:min-h-[340px] rounded-2xl overflow-hidden border border-[var(--border)]">
                  <LocationPickerMap
                    lat={form.lat.trim() === '' ? null : Number(form.lat)}
                    lng={form.lng.trim() === '' ? null : Number(form.lng)}
                    onPick={pickLocationFromMap}
                    heightClassName="h-full"
                  />
                </div>
                {locationSearchError && <p className="mt-2 text-xs text-rose-600">{locationSearchError}</p>}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-end gap-2 xl:hidden">
            <Button type="button" variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1 sm:flex-none" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
