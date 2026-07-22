'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GripVertical, Filter, Search, Flame, Clock, Pencil, Trash2, X, MapPin, Lock, LockOpen, Layers } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { LocationPickerMap } from '@/components/map/LocationPickerMap';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { LossStagePrompt, createLossPromptState, type LossPromptState } from '@/components/pipeline/LossStagePrompt';
import {
  WinStagePrompt,
  buildConverterOptions,
  createWinPromptState,
  type WinPromptState,
} from '@/components/pipeline/WinStagePrompt';
import { PipelineCustomerGroupList } from '@/components/pipeline/PipelineCustomerGroupList';
import { Badge } from '@/components/ui/Badge';
import { STAGES, type Stage } from '@/lib/data';
import { listManagers, listMyTeam, listRegionalManagers, listUsers, type TeamMember, type UserListItem } from '@/lib/auth-api';
import {
  createProject as createProjectApi,
  trashProject as trashProjectApi,
  listProjects as listProjectsApi,
  updateProject as updateProjectApi,
  type ApiProject,
} from '@/lib/projects-api';
import { cn, formatAED, formatNumber, formatNumberForInput, formatProjectValue, parseFormattedNumber, uniqueCustomerNames } from '@/lib/utils';
import { groupProjectsByCustomer } from '@/lib/group-projects-by-customer';
import { suggestCurrencyCode } from '@/lib/currency-defaults';
import { validateLossPrompt } from '@/lib/loss-reasons';
import { listActiveCurrencies, listActiveRegionDefaults, type ActiveCurrencyItem } from '@/lib/master-data-api';
import { ProjectCommercialFields } from '@/components/projects/ProjectCommercialFields';
import { CustomerSelect, isKnownCustomer } from '@/components/projects/CustomerSelect';
import { StagePicker } from '@/components/projects/StagePicker';
import {
  commercialSpecsComplete,
  formatProjectSpecs,
  formatSpecsSummary,
} from '@/lib/project-specs';
import { listCustomers } from '@/lib/customers-api';
import { canSetBusinessDivision } from '@/lib/permissions';
import {
  citiesForCountry,
  countryOptions,
  normalizeCountryName,
  projectCitiesForCountry,
} from '@/lib/locations';

type ProjectAssignment = {
  regionalManagerId: string | null;
  regionalManagerName: string;
  managerId: string | null;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
};

type ProjectFormState = {
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: '' | 'alubond architecture' | 'alubond transport' | 'uniqube';
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

type PipelineProject = {
  id: string;
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: 'alubond architecture' | 'alubond transport' | 'uniqube' | null;
  stage: Stage;
  value: number;
  valueLocal: number;
  currencyCode: string;
  valueAed: number;
  itemQuantity: number;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  itemName: string;
  lat: number;
  lng: number;
  probability: number;
  daysInStage: number;
  competitor: string | null;
  lossReason: string | null;
  owner: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
  managerId: string | null;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
  convertedById: string | null;
  convertedByName: string | null;
  updatedAt: string;
};

const PIPELINE_STAGE_MOVES_KEY = 'alubond-pipeline-stage-moves-enabled';
const PIPELINE_STAGES: Stage[] = [...STAGES, 'Lost', 'Won'];
const PIPELINE_VISIBLE_STAGES: Stage[] = PIPELINE_STAGES.filter((stage) => stage !== 'Approved');
const BUSINESS_DIVISIONS = ['alubond architecture', 'alubond transport', 'uniqube'] as const;
const FORM_FIELD_CLASS =
  'h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full';

const EMPTY_FORM: ProjectFormState = {
  name: '',
  city: '',
  country: '',
  developer: '',
  businessDivision: '',
  value: '',
  currencyCode: 'AED',
  itemQuantity: '',
  specThickness: '',
  specCore: '',
  specPaintType: '',
  lat: '',
  lng: '',
  stage: 'Lead Identified',
  probability: '',
  competitor: '',
  lossReason: '',
  regionalManagerId: '',
  managerId: '',
  salesRepIds: [],
  convertedById: '',
};

export default function PipelinePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<PipelineProject[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [mobileStage, setMobileStage] = useState<Stage>('Lead Identified');
  const [mobileQuery, setMobileQuery] = useState('');
  const [desktopQuery, setDesktopQuery] = useState('');
  const [businessDivisionFilter, setBusinessDivisionFilter] = useState<
    'ALL' | 'UNASSIGNED' | (typeof BUSINESS_DIVISIONS)[number]
  >('ALL');
  const [desktopFocusedStage, setDesktopFocusedStage] = useState<Stage | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [assignments, setAssignments] = useState<Record<string, ProjectAssignment>>({});
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<UserListItem[]>([]);
  const [salesReps, setSalesReps] = useState<UserListItem[]>([]);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [commercialPrompt, setCommercialPrompt] = useState<{
    projectId: string;
    targetStage: Stage;
    value: string;
    currencyCode: string;
    itemQuantity: string;
    specThickness: string;
    specCore: string;
    specPaintType: string;
    error: string | null;
    saving: boolean;
  } | null>(null);
  const [lossPrompt, setLossPrompt] = useState<{
    projectId: string;
    prompt: LossPromptState;
  } | null>(null);
  const [winPrompt, setWinPrompt] = useState<{
    projectId: string;
    commercial: {
      value: number;
      currencyCode: string;
      itemQuantity: number;
      specThickness: string;
      specCore: string;
      specPaintType: string;
    };
    prompt: WinPromptState;
  } | null>(null);
  const [projectPendingTrash, setProjectPendingTrash] = useState<PipelineProject | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [currencies, setCurrencies] = useState<ActiveCurrencyItem[]>([]);
  const [regionDefaults, setRegionDefaults] = useState<Record<string, string>>({});
  const [stageMovesEnabled, setStageMovesEnabled] = useState(false);
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(PIPELINE_STAGE_MOVES_KEY);
    if (stored === '1') setStageMovesEnabled(true);
  }, []);

  function toggleStageMovesEnabled() {
    setStageMovesEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PIPELINE_STAGE_MOVES_KEY, next ? '1' : '0');
      }
      if (!next) setDragging(null);
      return next;
    });
  }

  function toggleCustomerExpanded(customer: string) {
    setExpandedCustomers((prev) => ({ ...prev, [customer]: !prev[customer] }));
  }

  function defaultCurrencyForForm(country: string) {
    return suggestCurrencyCode({ country, regionDefaults });
  }

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const [currencyRows, regionRows] = await Promise.all([
          listActiveCurrencies(token),
          listActiveRegionDefaults(token),
        ]);
        setCurrencies(currencyRows);
        setRegionDefaults(
          Object.fromEntries(regionRows.map((row) => [row.name, row.defaultCurrencyCode])),
        );
      } catch {
        setCurrencies([{ code: 'AED', name: 'UAE Dirham', rateToAed: 1 }]);
      }
    })();
  }, [token]);

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isRegionalManager = user?.role === 'REGIONAL_MANAGER';
  const isSalesRep = user?.role === 'SALES_REP';
  const canCreateProject = Boolean(user);
  const canSetDivision = canSetBusinessDivision(user);
  const editingProject = editingId ? items.find((p) => p.id === editingId) ?? null : null;
  const regionalManagerForForm =
    (isRegionalManager && user?.id ? user.id : form.regionalManagerId) || '';
  const managerForForm =
    (isManager && user?.id ? user.id : form.managerId) || '';

  const selectedRegionalManager =
    isRegionalManager && user?.id
      ? regionalManagers.find((entry) => entry.id === user.id) ?? null
      : regionalManagers.find((entry) => entry.id === regionalManagerForForm) ?? null;

  const selectedManager =
    isManager && user?.id
      ? managers.find((manager) => manager.id === user.id) ?? null
      : managers.find((manager) => manager.id === managerForForm) ?? null;

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

  const [catalogCustomers, setCatalogCustomers] = useState<string[]>([]);
  const [extraCustomers, setExtraCustomers] = useState<string[]>([]);
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
        projectCities: projectCitiesForCountry(items, form.country),
      }),
    [form.country, form.city, items],
  );

  function totalFor(stage: Stage, projects = items) {
    return projects.filter((p) => p.stage === stage).reduce((a, b) => a + b.value, 0);
  }

  function matchesProjectQuery(project: PipelineProject, query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      project.name.toLowerCase().includes(q) ||
      project.city.toLowerCase().includes(q) ||
      project.developer.toLowerCase().includes(q)
    );
  }

  function matchesBusinessDivisionFilter(project: PipelineProject) {
    if (!canSetDivision || businessDivisionFilter === 'ALL') return true;
    if (businessDivisionFilter === 'UNASSIGNED') return !project.businessDivision?.trim();
    return project.businessDivision === businessDivisionFilter;
  }

  function filterPipelineProjects(projects: PipelineProject[], query: string) {
    return projects.filter(
      (project) => matchesProjectQuery(project, query) && matchesBusinessDivisionFilter(project),
    );
  }

  function requiresCommercialDetails(stage: Stage) {
    return ['Tender', 'Negotiation', 'Approved', 'PO Expected', 'Won'].includes(stage);
  }

  function validateCommercialInput(input: {
    value: string;
    itemQuantity: string;
    specThickness: string;
    specCore: string;
    specPaintType: string;
  }): string | null {
    const nextValue = parseFormattedNumber(input.value);
    const nextItemQuantity = parseFormattedNumber(input.itemQuantity);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      return 'Total project value must be greater than 0.';
    }
    if (!Number.isFinite(nextItemQuantity) || nextItemQuantity <= 0) {
      return 'Total project quantity must be greater than 0.';
    }
    if (!commercialSpecsComplete(input.specThickness, input.specCore, input.specPaintType)) {
      return 'Select thickness, core, and paint type.';
    }
    return null;
  }

  async function persistProjectStageUpdate(
    project: PipelineProject,
    nextStage: Stage,
    commercial: {
      value: number;
      currencyCode: string;
      itemQuantity: number;
      specThickness: string;
      specCore: string;
      specPaintType: string;
    },
    convertedById?: string | null,
  ) {
    const itemName = formatProjectSpecs(commercial.specThickness, commercial.specCore, commercial.specPaintType);
    const nextDaysInStage = project.stage === nextStage ? project.daysInStage : 1;
    const nextConvertedById = nextStage === 'Won' ? convertedById ?? project.convertedById : null;
    const nextConvertedByName =
      nextStage === 'Won'
        ? buildConverterOptions(project).find((option) => option.id === nextConvertedById)?.name ??
          project.convertedByName
        : null;
    setItems((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              stage: nextStage,
              daysInStage: nextDaysInStage,
              value: commercial.value,
              valueLocal: commercial.value,
              currencyCode: commercial.currencyCode,
              valueAed: project.valueAed,
              itemQuantity: commercial.itemQuantity,
              specThickness: commercial.specThickness,
              specCore: commercial.specCore,
              specPaintType: commercial.specPaintType,
              itemName,
              convertedById: nextConvertedById,
              convertedByName: nextConvertedByName,
            }
          : p,
      ),
    );
    if (!token) return;
    await updateProjectApi(token, project.id, {
      name: project.name,
      city: project.city,
      country: project.country,
      developer: project.developer,
      businessDivision: project.businessDivision,
      stage: nextStage,
      valueLocal: commercial.value,
      currencyCode: commercial.currencyCode,
      itemName,
      itemQuantity: commercial.itemQuantity,
      specThickness: commercial.specThickness,
      specCore: commercial.specCore,
      specPaintType: commercial.specPaintType,
      lat: project.lat,
      lng: project.lng,
      probability: project.probability,
      daysInStage: nextDaysInStage,
      competitor: project.competitor,
      lossReason: project.lossReason,
      regionalManagerId: project.regionalManagerId,
      managerId: project.managerId,
      salesRepIds: project.salesRepIds,
      convertedById: nextConvertedById,
    });
  }

  async function refreshCustomers(activeToken: string) {
    try {
      const rows = await listCustomers(activeToken);
      setCatalogCustomers(rows.map((row) => row.name));
    } catch {
      // Keep last known catalog; project forms still work with current value.
    }
  }

  async function refreshProjects(activeToken: string) {
    setProjectsLoading(true);
    setProjectsError(null);
    // Customers catalog is non-blocking — don't stall the board on it.
    void refreshCustomers(activeToken);
    try {
      const data = await listProjectsApi(activeToken);
      const mapped = data.map(toPipelineProject);
      setItems(mapped);
      setAssignments(
        Object.fromEntries(
          mapped.map((project) => [
            project.id,
            {
              regionalManagerId: project.regionalManagerId,
              regionalManagerName: project.regionalManagerName,
              managerId: project.managerId,
              managerName: project.managerName,
              salesRepIds: project.salesRepIds,
              salesRepNames: project.salesRepNames,
            },
          ]),
        ),
      );
    } catch {
      setProjectsError('Failed to load projects from server.');
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => {
    async function loadPeople() {
      if (!token || !canCreateProject) {
        setManagers([]);
        setRegionalManagers([]);
        setSalesReps([]);
        return;
      }

      setPeopleError(null);
      try {
        if (isAdmin || user?.role === 'CEO') {
          const [managerData, regionalManagerData, userData] = await Promise.all([
            listManagers(token),
            listRegionalManagers(token),
            listUsers(token),
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
                  requireDailyVisit: false,
                  createdAt: new Date(0).toISOString(),
                  lastLocationPingAt: null,
                  lastSeenAt: null,
                  manager: null,
                  regionalManager: null,
                  reportsTo: null,
                }))
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
                  requireDailyVisit: false,
                  createdAt: new Date(0).toISOString(),
                  lastLocationPingAt: null,
                  lastSeenAt: null,
                  manager: null,
                  regionalManager: null,
                  reportsTo: null,
                }))
          );
          setSalesReps(userData.filter((entry) => entry.role === 'SALES_REP'));
          return;
        }

        if (isRegionalManager && user) {
          const userData = await listUsers(token);
          setRegionalManagers(userData.filter((entry) => entry.role === 'REGIONAL_MANAGER' && entry.id === user.id));
          setManagers(userData.filter((entry) => entry.role === 'MANAGER'));
          setSalesReps(userData.filter((entry) => entry.role === 'SALES_REP'));
          return;
        }

        if (isSalesRep && user) {
          const userData = await listUsers(token);
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

        const teamData: TeamMember[] = await listMyTeam(token);
        setRegionalManagers(
          user?.regionalManagerId
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
                  requireDailyVisit: false,
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
        setManagers(
          user
            ? [
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
                  requireDailyVisit: false,
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
        setSalesReps(
          teamData.map((entry) => ({
            id: entry.id,
            email: entry.email,
            firstName: entry.firstName,
            lastName: entry.lastName,
            role: entry.role,
            managerId: entry.managerId,
            regionalManagerId: user?.regionalManagerId ?? null,
            reportsToId: null,
            regions: [],
            operationLocations: [],
            yearlyTarget: null,
            isActive: true,
            canSetBusinessDivision: false,
            requireDailyVisit: false,
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

    loadPeople();
  }, [token, canCreateProject, isAdmin, isManager, isRegionalManager, isSalesRep, user]);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setAssignments({});
      setProjectsLoading(false);
      return;
    }
    void refreshProjects(token);
  }, [token]);

  function onDrop(stage: Stage) {
    if (!stageMovesEnabled || !dragging) return;
    const dragged = items.find((item) => item.id === dragging);
    if (!dragged) {
      setDragging(null);
      return;
    }
    requestStageChange(dragged, stage);
    setDragging(null);
  }

  function requestStageChange(project: PipelineProject, stage: Stage) {
    if (stage === 'Lost') {
      setLossPrompt({
        projectId: project.id,
        prompt: createLossPromptState({ lossReason: project.lossReason, competitor: project.competitor }),
      });
      return;
    }
    if (requiresCommercialDetails(stage)) {
      setCommercialPrompt({
        projectId: project.id,
        targetStage: stage,
        value: formatNumberForInput(project.valueLocal > 0 ? project.valueLocal : project.valueAed > 0 ? project.valueAed : 0),
        currencyCode: project.currencyCode,
        itemQuantity: formatNumberForInput(project.itemQuantity),
        specThickness: project.specThickness ?? '',
        specCore: project.specCore ?? '',
        specPaintType: project.specPaintType ?? '',
        error: null,
        saving: false,
      });
      return;
    }
    void persistProjectStageUpdate(project, stage, {
      value: project.valueLocal > 0 ? project.valueLocal : project.valueAed,
      currencyCode: project.currencyCode,
      itemQuantity: project.itemQuantity,
      specThickness: project.specThickness,
      specCore: project.specCore,
      specPaintType: project.specPaintType,
    }).catch(() => {
      setProjectsError('Failed to update stage. Please retry.');
    });
  }

  function closeLossPrompt() {
    setLossPrompt(null);
    setDragging(null);
  }

  async function persistProjectLossUpdate(
    project: PipelineProject,
    loss: { lossReason: string; competitor: string | null },
  ) {
    const nextStage: Stage = 'Lost';
    const nextDaysInStage = project.stage === nextStage ? project.daysInStage : 1;
    setItems((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              stage: nextStage,
              daysInStage: nextDaysInStage,
              probability: 0,
              lossReason: loss.lossReason,
              competitor: loss.competitor,
            }
          : p,
      ),
    );
    if (!token) return;
    await updateProjectApi(token, project.id, {
      name: project.name,
      city: project.city,
      country: project.country,
      developer: project.developer,
      businessDivision: project.businessDivision,
      stage: nextStage,
      valueLocal: project.valueLocal > 0 ? project.valueLocal : project.valueAed,
      currencyCode: project.currencyCode,
      itemName: project.itemName,
      itemQuantity: project.itemQuantity,
      specThickness: project.specThickness,
      specCore: project.specCore,
      specPaintType: project.specPaintType,
      lat: project.lat,
      lng: project.lng,
      probability: 0,
      daysInStage: nextDaysInStage,
      competitor: loss.competitor,
      lossReason: loss.lossReason,
      regionalManagerId: project.regionalManagerId,
      managerId: project.managerId,
      salesRepIds: project.salesRepIds,
    });
  }

  async function submitLossPrompt() {
    if (!lossPrompt) return;
    const project = items.find((item) => item.id === lossPrompt.projectId);
    if (!project) {
      closeLossPrompt();
      return;
    }

    const validationError = validateLossPrompt(lossPrompt.prompt);
    if (validationError) {
      setLossPrompt((prev) => (prev ? { ...prev, prompt: { ...prev.prompt, error: validationError } } : prev));
      return;
    }

    const lossReason = lossPrompt.prompt.reason.trim();
    const competitor = lossPrompt.prompt.winner.trim() || null;

    setLossPrompt((prev) => (prev ? { ...prev, prompt: { ...prev.prompt, error: null, saving: true } } : prev));
    try {
      await persistProjectLossUpdate(project, { lossReason, competitor });
      closeLossPrompt();
    } catch {
      setLossPrompt((prev) =>
        prev ? { ...prev, prompt: { ...prev.prompt, saving: false, error: 'Failed to update stage. Please retry.' } } : prev,
      );
    }
  }

  function closeCommercialPrompt() {
    setCommercialPrompt(null);
    setDragging(null);
  }

  async function submitCommercialPrompt() {
    if (!commercialPrompt) return;
    const project = items.find((item) => item.id === commercialPrompt.projectId);
    if (!project) {
      closeCommercialPrompt();
      return;
    }

    const validationError = validateCommercialInput(commercialPrompt);
    if (validationError) {
      setCommercialPrompt((prev) => (prev ? { ...prev, error: validationError } : prev));
      return;
    }

    const nextValue = parseFormattedNumber(commercialPrompt.value);
    const nextItemQuantity = parseFormattedNumber(commercialPrompt.itemQuantity);
    const commercial = {
      value: nextValue,
      currencyCode: commercialPrompt.currencyCode,
      itemQuantity: nextItemQuantity,
      specThickness: commercialPrompt.specThickness,
      specCore: commercialPrompt.specCore,
      specPaintType: commercialPrompt.specPaintType,
    };

    if (commercialPrompt.targetStage === 'Won') {
      const options = buildConverterOptions(project);
      if (options.length === 0) {
        setCommercialPrompt((prev) =>
          prev
            ? {
                ...prev,
                error: 'Assign a sales rep, manager, or regional manager before marking Won.',
              }
            : prev,
        );
        return;
      }
      setCommercialPrompt(null);
      setWinPrompt({
        projectId: project.id,
        commercial,
        prompt: createWinPromptState({
          convertedById:
            project.convertedById && options.some((option) => option.id === project.convertedById)
              ? project.convertedById
              : options.length === 1
                ? options[0]!.id
                : null,
        }),
      });
      return;
    }

    setCommercialPrompt((prev) => (prev ? { ...prev, error: null, saving: true } : prev));
    try {
      await persistProjectStageUpdate(project, commercialPrompt.targetStage, commercial);
      closeCommercialPrompt();
    } catch {
      setCommercialPrompt((prev) =>
        prev ? { ...prev, saving: false, error: 'Failed to update stage. Please retry.' } : prev,
      );
    }
  }

  function closeWinPrompt() {
    setWinPrompt(null);
    setDragging(null);
  }

  async function submitWinPrompt() {
    if (!winPrompt) return;
    const project = items.find((item) => item.id === winPrompt.projectId);
    if (!project) {
      closeWinPrompt();
      return;
    }
    if (!winPrompt.prompt.convertedById) {
      setWinPrompt((prev) =>
        prev ? { ...prev, prompt: { ...prev.prompt, error: 'Select who converted this project.' } } : prev,
      );
      return;
    }

    setWinPrompt((prev) => (prev ? { ...prev, prompt: { ...prev.prompt, error: null, saving: true } } : prev));
    try {
      await persistProjectStageUpdate(project, 'Won', winPrompt.commercial, winPrompt.prompt.convertedById);
      closeWinPrompt();
    } catch (error) {
      setWinPrompt((prev) =>
        prev
          ? {
              ...prev,
              prompt: {
                ...prev.prompt,
                saving: false,
                error: error instanceof Error ? error.message : 'Failed to update stage. Please retry.',
              },
            }
          : prev,
      );
    }
  }

function normalizeOptionalId(value: string): string | null {
  return value.trim() ? value : null;
}

function buildProjectAssignmentPayload(
  form: ProjectFormState,
  isManager: boolean,
  isRegionalManager: boolean,
  isSalesRep: boolean,
  userId?: string,
  userManagerId?: string | null,
) {
  return {
    regionalManagerId:
      isRegionalManager && userId
        ? userId
        : normalizeOptionalId(form.regionalManagerId),
    managerId:
      isManager && userId
        ? userId
        : isSalesRep
          ? normalizeOptionalId(userManagerId ?? form.managerId)
          : normalizeOptionalId(form.managerId),
    salesRepIds:
      isSalesRep && userId
        ? form.salesRepIds.length > 0
          ? form.salesRepIds
          : [userId]
        : form.salesRepIds,
  };
}

  function handleCountryChange(nextCountry: string) {
    const countryChanged = normalizeCountryName(form.country) !== normalizeCountryName(nextCountry);
    if (countryChanged) setLocationQuery('');
    setForm((prev) => ({
      ...prev,
      country: nextCountry,
      city: countryChanged ? '' : prev.city,
      currencyCode: defaultCurrencyForForm(normalizeCountryName(nextCountry) || nextCountry),
    }));
  }

  function handleCityChange(nextCity: string) {
    setForm((prev) => ({ ...prev, city: nextCity }));
    setLocationQuery(nextCity);
  }

  function openCreateForm() {
    if (!canCreateProject) return;
    setEditingId(null);
    setFormError(null);
    setLocationQuery('');
    setLocationSearchError(null);
    setExtraCustomers([]);
    setForm({
      ...EMPTY_FORM,
      regionalManagerId: isRegionalManager && user?.id ? user.id : '',
      managerId: isManager && user?.id ? user.id : isSalesRep ? (user?.managerId ?? '') : '',
      salesRepIds: isSalesRep && user?.id ? [user.id] : [],
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setFormError(null);
    setLocationQuery('');
    setLocationSearchError(null);
    setExtraCustomers([]);
    setForm({
      ...EMPTY_FORM,
      regionalManagerId: isRegionalManager && user?.id ? user.id : '',
      managerId: isManager && user?.id ? user.id : isSalesRep ? (user?.managerId ?? '') : '',
      salesRepIds: isSalesRep && user?.id ? [user.id] : [],
    });
  }

  useEffect(() => {
    if (searchParams.get('createProject') !== '1' || !user) return;
    openCreateForm();
    router.replace('/pipeline');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  function openEditForm(project: PipelineProject) {
    if (!canCreateProject) return;
    const existing = assignments[project.id];
    setEditingId(project.id);
    setFormError(null);
    setLocationQuery(project.city);
    setLocationSearchError(null);
    setExtraCustomers([]);
    setForm({
      name: project.name,
      city: project.city,
      country: normalizeCountryName(project.country),
      developer: project.developer,
      businessDivision: project.businessDivision ?? '',
      value: formatNumberForInput(project.valueLocal > 0 ? project.valueLocal : project.valueAed),
      currencyCode: project.currencyCode,
      itemQuantity: formatNumberForInput(project.itemQuantity),
      specThickness: project.specThickness ?? '',
      specCore: project.specCore ?? '',
      specPaintType: project.specPaintType ?? '',
      lat: String(project.lat),
      lng: String(project.lng),
      stage: project.stage,
      probability: String(project.probability),
      competitor: project.competitor ?? '',
      lossReason: project.lossReason ?? '',
      regionalManagerId: existing?.regionalManagerId ?? (isRegionalManager && user?.id ? user.id : ''),
      managerId: existing?.managerId ?? (isManager && user?.id ? user.id : isSalesRep ? (user?.managerId ?? '') : ''),
      salesRepIds: existing?.salesRepIds ?? (isSalesRep && user?.id ? [user.id] : []),
      convertedById: project.convertedById ?? '',
    });
    setIsFormOpen(true);
  }

  function requestTrashProject(project: PipelineProject) {
    if (!canCreateProject) return;
    setProjectPendingTrash(project);
  }

  async function confirmTrashProject() {
    if (!token || !projectPendingTrash) return;

    setDeletingProject(true);
    setProjectsError(null);
    try {
      await trashProjectApi(token, projectPendingTrash.id);
      if (editingId === projectPendingTrash.id) {
        closeForm();
      }
      setProjectPendingTrash(null);
      await refreshProjects(token);
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : 'Failed to move project to trash.');
    } finally {
      setDeletingProject(false);
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
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );
      if (!response.ok) {
        throw new Error('Location lookup failed');
      }
      const results = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
      const first = results[0] ?? null;
      if (!first) {
        setLocationSearchError('No location found. Try city, address, or country name.');
        setFormError(null);
        return;
      }
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setLocationSearchError('Location result is invalid.');
        setFormError(null);
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canCreateProject) return;
    if (!token) {
      setFormError('Session expired. Please login again.');
      return;
    }
    setFormError(null);

    const name = form.name.trim();
    const city = form.city.trim();
    const country = normalizeCountryName(form.country.trim());
    const developer = form.developer.trim();
    const value = parseFormattedNumber(form.value);
    const itemQuantity = parseFormattedNumber(form.itemQuantity);
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const probability = Math.max(0, Math.min(100, Number(form.probability)));
    const businessDivision = canSetDivision
      ? form.businessDivision || null
      : editingProject?.businessDivision ?? null;
    const normalizedValue = Number.isFinite(value) && value >= 0 ? value : 0;
    const normalizedItemQuantity = Number.isFinite(itemQuantity) && itemQuantity > 0 ? itemQuantity : 0;
    const normalizedSpecs = {
      specThickness: form.specThickness,
      specCore: form.specCore,
      specPaintType: form.specPaintType,
    };
    const normalizedItemName = commercialSpecsComplete(
      normalizedSpecs.specThickness,
      normalizedSpecs.specCore,
      normalizedSpecs.specPaintType,
    )
      ? formatProjectSpecs(
          normalizedSpecs.specThickness,
          normalizedSpecs.specCore,
          normalizedSpecs.specPaintType,
        )
      : '';
    const assignmentPayload = buildProjectAssignmentPayload(
      form,
      isManager,
      isRegionalManager,
      isSalesRep,
      user?.id,
      user?.managerId,
    );

    if (!name || !city || !country) {
      setFormError('Fill project name, country, and city.');
      return;
    }
    if (!developer || !isKnownCustomer(developer, customerSuggestions)) {
      setFormError('Select a customer from the list, or add a new one.');
      return;
    }
    if (requiresCommercialDetails(form.stage)) {
      const commercialError = validateCommercialInput({
        value: form.value,
        itemQuantity: form.itemQuantity,
        specThickness: form.specThickness,
        specCore: form.specCore,
        specPaintType: form.specPaintType,
      });
      if (commercialError) {
        setFormError(commercialError);
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

    const normalizedLat = Number.isFinite(lat) ? lat : 0;
    const normalizedLng = Number.isFinite(lng) ? lng : 0;
    const normalizedProbability =
      form.stage === 'Lost' ? 0 : Number.isFinite(probability) ? probability : 0;
    const normalizedLossReason = form.stage === 'Lost' ? form.lossReason.trim() : null;
    const normalizedCompetitor = form.competitor.trim() || null;
    const normalizedConvertedById = form.stage === 'Won' ? form.convertedById || null : null;

    if (editingProject) {
      const nextDaysInStage = editingProject.stage === form.stage ? editingProject.daysInStage : 1;
      try {
        await updateProjectApi(token, editingProject.id, {
          name,
          city,
          country,
          developer,
          businessDivision,
          stage: form.stage,
          valueLocal: normalizedValue,
        currencyCode: form.currencyCode,
          itemName: normalizedItemName,
          itemQuantity: normalizedItemQuantity,
          specThickness: normalizedSpecs.specThickness,
          specCore: normalizedSpecs.specCore,
          specPaintType: normalizedSpecs.specPaintType,
          lat: normalizedLat,
          lng: normalizedLng,
          probability: normalizedProbability,
          daysInStage: nextDaysInStage,
          competitor: normalizedCompetitor,
          lossReason: normalizedLossReason,
          ...assignmentPayload,
          salesRepIds: form.salesRepIds,
          convertedById: normalizedConvertedById,
        });
        await refreshProjects(token);
        closeForm();
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Failed to update project.');
      }
      return;
    }
    try {
      await createProjectApi(token, {
        name,
        city,
        country,
        developer,
        businessDivision,
        stage: form.stage,
        valueLocal: normalizedValue,
        currencyCode: form.currencyCode,
        itemName: normalizedItemName,
        itemQuantity: normalizedItemQuantity,
        specThickness: normalizedSpecs.specThickness,
        specCore: normalizedSpecs.specCore,
        specPaintType: normalizedSpecs.specPaintType,
        lat: normalizedLat,
        lng: normalizedLng,
        probability: normalizedProbability,
        daysInStage: 1,
        competitor: normalizedCompetitor,
        lossReason: normalizedLossReason,
        ...assignmentPayload,
        salesRepIds: form.salesRepIds,
        convertedById: normalizedConvertedById,
      });
      await refreshProjects(token);
      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create project.');
    }
  }

  const mobileStageItems = useMemo(
    () => filterPipelineProjects(items.filter((project) => project.stage === mobileStage), mobileQuery),
    [items, mobileStage, mobileQuery, businessDivisionFilter, canSetDivision],
  );

  const desktopFilteredItems = useMemo(
    () => filterPipelineProjects(items, desktopQuery),
    [items, desktopQuery, businessDivisionFilter, canSetDivision],
  );

  useEffect(() => {
    if (!groupByCustomer || !mobileQuery.trim()) return;
    setExpandedCustomers((prev) => {
      const next = { ...prev };
      for (const group of groupProjectsByCustomer(mobileStageItems)) {
        next[group.customer] = true;
      }
      return next;
    });
  }, [groupByCustomer, mobileQuery, mobileStageItems]);

  useEffect(() => {
    if (!groupByCustomer || !desktopQuery.trim()) return;
    setExpandedCustomers((prev) => {
      const next = { ...prev };
      for (const group of groupProjectsByCustomer(desktopFilteredItems)) {
        next[group.customer] = true;
      }
      return next;
    });
  }, [groupByCustomer, desktopQuery, desktopFilteredItems]);

  const mobileVisibleItems = canSetDivision
    ? items.filter((project) => matchesBusinessDivisionFilter(project))
    : items;
  const desktopVisibleStages = desktopFocusedStage ? [desktopFocusedStage] : PIPELINE_VISIBLE_STAGES;

  return (
    <>
      <div className="hidden md:flex px-4 lg:px-8 pt-6 lg:pt-8 pb-4 justify-end">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-3" />
            <input
              value={desktopQuery}
              onChange={(event) => setDesktopQuery(event.target.value)}
              className="pl-9 pr-3 h-9 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm placeholder:text-3 w-64"
              placeholder="Filter projects…"
            />
          </div>
          {canSetDivision ? (
            <select
              value={businessDivisionFilter}
              onChange={(event) =>
                setBusinessDivisionFilter(
                  event.target.value as 'ALL' | 'UNASSIGNED' | (typeof BUSINESS_DIVISIONS)[number],
                )
              }
              className="h-9 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
              aria-label="Filter by business division"
            >
              <option value="ALL">All divisions</option>
              <option value="UNASSIGNED">Unassigned</option>
              {BUSINESS_DIVISIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => setGroupByCustomer((prev) => !prev)}
            className={cn(
              'h-9 px-3 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition-colors',
              groupByCustomer
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-[var(--surface-2)] text-2 border-[var(--border)] hover:border-[var(--border-strong)]',
            )}
            aria-pressed={groupByCustomer}
            title={groupByCustomer ? 'Showing projects grouped by customer' : 'Group projects by customer'}
          >
            <Layers className="h-4 w-4" />
            Group
          </button>
          <button
            type="button"
            onClick={toggleStageMovesEnabled}
            className={cn(
              'h-9 px-3 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition-colors',
              stageMovesEnabled
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-[var(--surface-2)] text-2 border-[var(--border)] hover:border-[var(--border-strong)]',
            )}
            aria-pressed={stageMovesEnabled}
            title={stageMovesEnabled ? 'Stage moves enabled — drag cards or use move controls' : 'Enable stage moves to drag projects between columns'}
          >
            {stageMovesEnabled ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {stageMovesEnabled ? 'Moving on' : 'Enable moves'}
          </button>
        </div>
      </div>

      {projectsLoading && <p className="px-4 lg:px-8 pb-2 text-sm text-3">Loading projects...</p>}
      {projectsError && <p className="px-4 lg:px-8 pb-2 text-sm text-rose-600">{projectsError}</p>}
      {!projectsLoading && !projectsError && items.length === 0 && (
        <p className="px-4 lg:px-8 pb-2 text-sm text-3">No projects yet. Create your first project.</p>
      )}

      <div className="md:hidden px-4 pt-6 pb-8 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-3" />
            <input
              value={mobileQuery}
              onChange={(event) => setMobileQuery(event.target.value)}
              placeholder="Search…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setGroupByCustomer((prev) => !prev)}
            className={cn(
              'h-10 w-10 shrink-0 rounded-xl border inline-flex items-center justify-center transition-colors',
              groupByCustomer
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-[var(--surface-2)] text-2 border-[var(--border)]',
            )}
            aria-pressed={groupByCustomer}
            aria-label={groupByCustomer ? 'Ungroup by customer' : 'Group by customer'}
            title={groupByCustomer ? 'Grouped by customer' : 'Group by customer'}
          >
            <Layers className="h-4 w-4" />
          </button>

          {canSetDivision ? (
            <div className="relative shrink-0">
              <span
                className={cn(
                  'h-10 w-10 rounded-xl border inline-flex items-center justify-center pointer-events-none',
                  businessDivisionFilter !== 'ALL'
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-[var(--surface-2)] text-2 border-[var(--border)]',
                )}
                aria-hidden
              >
                <Filter className="h-4 w-4" />
              </span>
              <select
                value={businessDivisionFilter}
                onChange={(event) =>
                  setBusinessDivisionFilter(
                    event.target.value as 'ALL' | 'UNASSIGNED' | (typeof BUSINESS_DIVISIONS)[number],
                  )
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Filter by business division"
                title={
                  businessDivisionFilter === 'ALL'
                    ? 'All divisions'
                    : businessDivisionFilter === 'UNASSIGNED'
                      ? 'Unassigned'
                      : businessDivisionFilter
                }
              >
                <option value="ALL">All divisions</option>
                <option value="UNASSIGNED">Unassigned</option>
                {BUSINESS_DIVISIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <div className="inline-flex gap-2 min-w-max">
            {PIPELINE_VISIBLE_STAGES.map((stage) => {
              const count = mobileVisibleItems.filter((project) => project.stage === stage).length;
              return (
                <button
                  key={`mobile-stage-${stage}`}
                  type="button"
                  onClick={() => setMobileStage(stage)}
                  className={cn(
                    'h-8 px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1.5',
                    mobileStage === stage
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-[var(--surface)] text-2 border-[var(--border)]'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', stageDot(stage), mobileStage === stage && 'bg-white')} />
                  {stageTitle(stage)}
                  <span className={cn('text-[10px]', mobileStage === stage ? 'text-white/90' : 'text-3')}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5">
          <p className="text-[11px] text-3">Stage value</p>
          <p className="text-sm font-semibold">{formatAED(totalFor(mobileStage, mobileVisibleItems), true)}</p>
        </div>

        {mobileStageItems.length === 0 ? (
          <div className="text-center py-8 text-xs text-3 border border-dashed border-[var(--border-strong)] rounded-xl">
            No projects in {stageTitle(mobileStage)}.
          </div>
        ) : groupByCustomer ? (
          <PipelineCustomerGroupList
            projects={mobileStageItems}
            expandedCustomers={expandedCustomers}
            onToggleCustomer={toggleCustomerExpanded}
            renderProject={(project) => (
              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-soft">
                <div className="flex items-start gap-2">
                  <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold tracking-tight leading-snug line-clamp-2">{project.name}</h4>
                    <p className="mt-1 text-[11px] text-3 truncate">{project.city}</p>
                  </Link>
                  <div className="flex items-center gap-0.5">
                    {canCreateProject && (
                      <button
                        type="button"
                        onClick={() => openEditForm(project)}
                        className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                        aria-label={`Edit ${project.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canCreateProject && (
                      <button
                        type="button"
                        onClick={() => requestTrashProject(project)}
                        className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-3 hover:text-rose-600 hover:bg-rose-500/10"
                        aria-label={`Move ${project.name} to trash`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-base font-bold tracking-tight num-tabular">
                    {formatProjectValue(project, user?.role, true)}
                  </p>
                  <span className="text-[10px] text-3 num-tabular inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {project.daysInStage}d
                  </span>
                </div>

                <div className="mt-1.5 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full bg-brand-600" style={{ width: `${project.probability}%` }} />
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-3">Manager</p>
                    <p className="font-medium truncate">{project.managerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3">Reps</p>
                    <p className="font-medium">{project.salesRepNames.length}</p>
                  </div>
                </div>

                <div className="mt-2">
                  <label className="text-[11px] text-3 block mb-1">Move stage</label>
                  <select
                    value={project.stage}
                    onChange={(event) => requestStageChange(project, event.target.value as Stage)}
                    disabled={false}
                    className="h-9 w-full px-2.5 rounded-lg bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {PIPELINE_VISIBLE_STAGES.map((stage) => (
                      <option key={`mobile-move-${project.id}-${stage}`} value={stage}>
                        {stageTitle(stage)}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            )}
          />
        ) : (
          <div className="space-y-2">
            {mobileStageItems.map((project) => (
              <article key={`mobile-${project.id}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-soft">
                <div className="flex items-start gap-2">
                  <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold tracking-tight leading-snug line-clamp-2">{project.name}</h4>
                    <p className="mt-1 text-[11px] text-3 truncate">{project.city} · {project.developer}</p>
                  </Link>
                  <div className="flex items-center gap-0.5">
                    {canCreateProject && (
                      <button
                        type="button"
                        onClick={() => openEditForm(project)}
                        className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                        aria-label={`Edit ${project.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canCreateProject && (
                      <button
                        type="button"
                        onClick={() => requestTrashProject(project)}
                        className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-3 hover:text-rose-600 hover:bg-rose-500/10"
                        aria-label={`Move ${project.name} to trash`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-base font-bold tracking-tight num-tabular">
                    {formatProjectValue(project, user?.role, true)}
                  </p>
                  <span className="text-[10px] text-3 num-tabular inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {project.daysInStage}d
                  </span>
                </div>

                <div className="mt-1.5 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full bg-brand-600" style={{ width: `${project.probability}%` }} />
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-3">Manager</p>
                    <p className="font-medium truncate">{project.managerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3">Reps</p>
                    <p className="font-medium">{project.salesRepNames.length}</p>
                  </div>
                </div>

                <div className="mt-2">
                  <label className="text-[11px] text-3 block mb-1">Move stage</label>
                  <select
                    value={project.stage}
                    onChange={(event) => requestStageChange(project, event.target.value as Stage)}
                    disabled={false}
                    className="h-9 w-full px-2.5 rounded-lg bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {PIPELINE_VISIBLE_STAGES.map((stage) => (
                      <option key={`mobile-move-${project.id}-${stage}`} value={stage}>
                        {stageTitle(stage)}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block px-4 lg:px-8">
        <div className="overflow-x-auto -mx-4 lg:-mx-8 px-4 lg:px-8 pb-8">
          <div className="flex gap-3 min-w-max">
            {desktopVisibleStages.map((stage) => {
              const cards = desktopFilteredItems.filter((p) => p.stage === stage);
              return (
                <div
                  key={stage}
                  onDragOver={(e) => {
                    if (stageMovesEnabled) e.preventDefault();
                  }}
                  onDrop={() => onDrop(stage)}
                  className={cn(
                    'w-[300px] shrink-0 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] flex flex-col',
                    stageMovesEnabled && dragging && 'ring-1 ring-brand-600/20',
                  )}
                >
                  <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', stageDot(stage))} />
                      <h3 className="text-sm font-semibold tracking-tight truncate">{stageTitle(stage)}</h3>
                      <Badge tone="neutral" className="!text-[10px]">{cards.length}</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDesktopFocusedStage((current) => (current === stage ? null : stage))}
                      className={cn(
                        'text-3 hover:text-[var(--text)]',
                        desktopFocusedStage === stage && 'text-[var(--text)]'
                      )}
                      title={desktopFocusedStage === stage ? 'Show all stages' : `Focus ${stageTitle(stage)}`}
                      aria-label={desktopFocusedStage === stage ? 'Show all stages' : `Focus ${stageTitle(stage)}`}
                    >
                      <Filter className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="px-4 pb-2 text-[11px] text-3 num-tabular">
                    {formatAED(cards.reduce((sum, project) => sum + project.value, 0), true)}
                  </div>

                  <div className="flex-1 min-h-[200px] p-2 space-y-2">
                    {cards.length === 0 ? (
                      <div className="text-center py-10 text-[11px] text-3 border border-dashed border-[var(--border-strong)] rounded-xl">
                        Drop projects here
                      </div>
                    ) : groupByCustomer ? (
                      <PipelineCustomerGroupList
                        projects={cards}
                        expandedCustomers={expandedCustomers}
                        onToggleCustomer={toggleCustomerExpanded}
                        groupClassName="rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]"
                        headerClassName="px-2 py-2"
                        projectsClassName="space-y-2 p-2"
                        renderProject={(p) => (
                          <article
                            draggable={stageMovesEnabled}
                            onDragStart={() => {
                              if (stageMovesEnabled) setDragging(p.id);
                            }}
                            onDragEnd={() => setDragging(null)}
                            className={cn(
                              'group surface rounded-xl border border-[var(--border)] p-3 shadow-soft transition-all',
                              stageMovesEnabled
                                ? 'cursor-grab active:cursor-grabbing hover:shadow-card hover:-translate-y-0.5'
                                : 'cursor-default',
                              dragging === p.id ? 'opacity-50' : '',
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {stageMovesEnabled ? (
                                <GripVertical className="h-3.5 w-3.5 text-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              ) : null}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2">
                                  <Link href={`/projects/${p.id}`} className="block flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
                                      {p.name}
                                    </h4>
                                  </Link>
                                  <div className="flex items-center gap-0.5">
                                    {canCreateProject && (
                                      <button
                                        type="button"
                                        onClick={() => openEditForm(p)}
                                        className="h-6 w-6 rounded-md inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                                        aria-label={`Edit ${p.name}`}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {canCreateProject && (
                                      <button
                                        type="button"
                                        onClick={() => requestTrashProject(p)}
                                        className="h-6 w-6 rounded-md inline-flex items-center justify-center text-3 hover:text-rose-600 hover:bg-rose-500/10"
                                        aria-label={`Move ${p.name} to trash`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="mt-1 text-[11px] text-3 truncate">{p.city}</p>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className="text-sm font-bold tracking-tight num-tabular">
                                    {formatProjectValue(p, user?.role, true)}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-3 truncate max-w-[110px]">
                                      {(() => {
                                        const specs = formatSpecsSummary(p);
                                        const quantity = p.itemQuantity > 0 ? `${formatNumber(p.itemQuantity, 2)} m²` : '';
                                        return [specs, quantity].filter(Boolean).join(' · ');
                                      })()}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-3 num-tabular">
                                      <Clock className="h-2.5 w-2.5" /> {p.daysInStage}d
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                                  <div className="h-full bg-brand-600" style={{ width: `${p.probability}%` }} />
                                </div>
                                <div className="mt-2.5 flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] text-3">Manager</p>
                                    <p className="text-[11px] font-medium truncate">{p.managerName}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 max-w-[55%] justify-end">
                                    <span className="chip !text-[9px] !px-1.5 !py-0 shrink-0">rep {p.salesRepNames.length}</span>
                                    {p.valueAed > 5_000_000 && <Flame className="h-3 w-3 text-amber-500 shrink-0" />}
                                    {p.competitor && (
                                      <span
                                        className="chip !text-[9px] !px-1.5 !py-0 max-w-[110px] truncate whitespace-nowrap"
                                        title={`vs ${p.competitor}`}
                                      >
                                        vs {p.competitor}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </article>
                        )}
                      />
                    ) : (
                      cards.map((p) => (
                        <article
                          key={p.id}
                          draggable={stageMovesEnabled}
                          onDragStart={() => {
                            if (stageMovesEnabled) setDragging(p.id);
                          }}
                          onDragEnd={() => setDragging(null)}
                          className={cn(
                            'group surface rounded-xl border border-[var(--border)] p-3 shadow-soft transition-all',
                            stageMovesEnabled
                              ? 'cursor-grab active:cursor-grabbing hover:shadow-card hover:-translate-y-0.5'
                              : 'cursor-default',
                            dragging === p.id ? 'opacity-50' : '',
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {stageMovesEnabled ? (
                              <GripVertical className="h-3.5 w-3.5 text-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            ) : null}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <Link href={`/projects/${p.id}`} className="block flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
                                    {p.name}
                                  </h4>
                                </Link>
                                <div className="flex items-center gap-0.5">
                                  {canCreateProject && (
                                    <button
                                      type="button"
                                      onClick={() => openEditForm(p)}
                                      className="h-6 w-6 rounded-md inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                                      aria-label={`Edit ${p.name}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {canCreateProject && (
                                    <button
                                      type="button"
                                      onClick={() => requestTrashProject(p)}
                                      className="h-6 w-6 rounded-md inline-flex items-center justify-center text-3 hover:text-rose-600 hover:bg-rose-500/10"
                                      aria-label={`Move ${p.name} to trash`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="mt-1 text-[11px] text-3 truncate">{p.city} · {p.developer}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-bold tracking-tight num-tabular">
                                  {formatProjectValue(p, user?.role, true)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-3 truncate max-w-[110px]">
                                    {(() => {
                                      const specs = formatSpecsSummary(p);
                                      const quantity = p.itemQuantity > 0 ? `${formatNumber(p.itemQuantity, 2)} m²` : '';
                                      return [specs, quantity].filter(Boolean).join(' · ');
                                    })()}
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] text-3 num-tabular">
                                    <Clock className="h-2.5 w-2.5" /> {p.daysInStage}d
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                                <div className="h-full bg-brand-600" style={{ width: `${p.probability}%` }} />
                              </div>
                              <div className="mt-2.5 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] text-3">Manager</p>
                                  <p className="text-[11px] font-medium truncate">{p.managerName}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 max-w-[55%] justify-end">
                                  <span className="chip !text-[9px] !px-1.5 !py-0 shrink-0">rep {p.salesRepNames.length}</span>
                                  {p.valueAed > 5_000_000 && <Flame className="h-3 w-3 text-amber-500 shrink-0" />}
                                  {p.competitor && (
                                    <span
                                      className="chip !text-[9px] !px-1.5 !py-0 max-w-[110px] truncate whitespace-nowrap"
                                      title={`vs ${p.competitor}`}
                                    >
                                      vs {p.competitor}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {lossPrompt && (
        <LossStagePrompt
          prompt={lossPrompt.prompt}
          onChange={(prompt) => setLossPrompt((prev) => (prev ? { ...prev, prompt } : prev))}
          onClose={closeLossPrompt}
          onSubmit={() => void submitLossPrompt()}
        />
      )}

      {winPrompt && (
        <WinStagePrompt
          prompt={winPrompt.prompt}
          options={buildConverterOptions(
            items.find((item) => item.id === winPrompt.projectId) ?? {
              salesRepIds: [],
              salesRepNames: [],
              managerId: null,
              managerName: '',
              regionalManagerId: null,
              regionalManagerName: '',
            },
          )}
          onChange={(prompt) => setWinPrompt((prev) => (prev ? { ...prev, prompt } : prev))}
          onClose={closeWinPrompt}
          onSubmit={() => void submitWinPrompt()}
        />
      )}

      {commercialPrompt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg surface border border-[var(--border)] rounded-2xl shadow-card p-4">
            <h2 className="text-base font-semibold tracking-tight">Required before moving stage</h2>
            <p className="mt-1 text-sm text-2">
              To move this project to <span className="font-semibold">{stageTitle(commercialPrompt.targetStage)}</span>, provide commercial details and specifications.
            </p>

            <div className="mt-4">
              <ProjectCommercialFields
                idPrefix="stage-move"
                value={commercialPrompt.value}
                currencyCode={commercialPrompt.currencyCode}
                currencies={currencies}
                itemQuantity={commercialPrompt.itemQuantity}
                specThickness={commercialPrompt.specThickness}
                specCore={commercialPrompt.specCore}
                specPaintType={commercialPrompt.specPaintType}
                onValueChange={(value) =>
                  setCommercialPrompt((prev) => (prev ? { ...prev, value, error: null } : prev))
                }
                onCurrencyCodeChange={(currencyCode) =>
                  setCommercialPrompt((prev) => (prev ? { ...prev, currencyCode, error: null } : prev))
                }
                onItemQuantityChange={(itemQuantity) =>
                  setCommercialPrompt((prev) => (prev ? { ...prev, itemQuantity, error: null } : prev))
                }
                onSpecThicknessChange={(specThickness) =>
                  setCommercialPrompt((prev) => (prev ? { ...prev, specThickness, error: null } : prev))
                }
                onSpecCoreChange={(specCore) =>
                  setCommercialPrompt((prev) => (prev ? { ...prev, specCore, error: null } : prev))
                }
                onSpecPaintTypeChange={(specPaintType) =>
                  setCommercialPrompt((prev) => (prev ? { ...prev, specPaintType, error: null } : prev))
                }
                required
              />
              {commercialPrompt.error && <p className="mt-2 text-xs text-rose-600">{commercialPrompt.error}</p>}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={closeCommercialPrompt}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void submitCommercialPrompt()}
                disabled={commercialPrompt.saving}
              >
                {commercialPrompt.saving ? 'Saving...' : 'Save and move'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--surface)] sm:bg-black/40 sm:backdrop-blur-sm sm:p-4 overflow-hidden">
          <div className="w-full h-full sm:h-[calc(100vh-2rem)] sm:max-w-[min(1400px,100%)] sm:mx-auto sm:rounded-2xl surface sm:border border-[var(--border)] shadow-card flex flex-col overflow-hidden">
            <div className="shrink-0 p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
              <h2 className="text-base font-semibold tracking-tight">{editingId ? 'Edit project' : 'Add project'}</h2>
              <button
                onClick={closeForm}
                className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden overscroll-contain">
                <div className="grid grid-cols-1 xl:grid-cols-[430px,1fr] xl:h-full xl:min-h-0">
                  <div className="p-4 space-y-3 border-b xl:border-b-0 xl:border-r border-[var(--border)] xl:overflow-y-auto xl:min-h-0">
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Project name"
                  required
                  className={FORM_FIELD_CLASS}
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
                  canManage={canCreateProject}
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
                    if (token) await refreshProjects(token);
                  }}
                />
                {canSetDivision ? (
                  <select
                    value={form.businessDivision}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        businessDivision: e.target.value as ProjectFormState['businessDivision'],
                      }))
                    }
                    className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
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
                  idPrefix="project-form"
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
                {requiresCommercialDetails(form.stage) && (
                  <p className="mt-2 text-[11px] text-amber-600">
                    Quotation stage and later require total value, quantity (m²), and specifications.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={form.lat}
                    onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
                    placeholder="Latitude"
                    className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                  />
                  <input
                    type="number"
                    step="any"
                    value={form.lng}
                    onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
                    placeholder="Longitude"
                    className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                  />
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.probability}
                  onChange={(e) => setForm((prev) => ({ ...prev, probability: e.target.value }))}
                  placeholder="Probability (%)"
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                />
                {form.stage !== 'Lost' ? (
                  <input
                    value={form.competitor}
                    onChange={(e) => setForm((prev) => ({ ...prev, competitor: e.target.value }))}
                    placeholder="Competitor (optional)"
                    className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
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
                  className={cn(
                    'h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full',
                    isRegionalManager && 'opacity-70 cursor-not-allowed',
                  )}
                >
                  <option value="">{isRegionalManager ? 'Your regional profile' : 'Assign regional manager (optional)'}</option>
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
                  className={cn(
                    'h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full',
                    isManager && 'opacity-70 cursor-not-allowed',
                  )}
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
                            <span>{rep.firstName} {rep.lastName}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                {peopleError && <p className="text-xs text-rose-600">{peopleError}</p>}
                {formError && <p className="text-xs text-rose-600">{formError}</p>}
                <div className="hidden xl:flex items-center justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={closeForm}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm">{editingId ? 'Save changes' : 'Create project'}</Button>
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
                <Button type="button" variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="flex-1 sm:flex-none">
                  {editingId ? 'Save changes' : 'Create project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(projectPendingTrash)}
        title="Move to trash?"
        description={
          projectPendingTrash
            ? `Move "${projectPendingTrash.name}" to trash? You can restore it later from Trash.`
            : ''
        }
        confirmLabel="Move to trash"
        cancelLabel="Cancel"
        destructive
        loading={deletingProject}
        onCancel={() => {
          if (deletingProject) return;
          setProjectPendingTrash(null);
        }}
        onConfirm={() => void confirmTrashProject()}
      />
    </>
  );
}

function stageDot(s: Stage) {
  return ({
    'Lead Identified': 'bg-ink-400',
    'Consultant Contacted': 'bg-sky-500',
    Specification: 'bg-violet-500',
    'Sample Submitted': 'bg-indigo-500',
    Tender: 'bg-amber-500',
    Negotiation: 'bg-orange-500',
    Approved: 'bg-teal-500',
    'PO Expected': 'bg-emerald-500',
    Won: 'bg-emerald-600',
    Lost: 'bg-rose-500',
  } as Record<Stage, string>)[s];
}

function stageTitle(stage: Stage) {
  if (stage === 'Tender') return 'Quotation';
  if (stage === 'PO Expected') return 'po awaited';
  if (stage === 'Lost') return 'Loss';
  if (stage === 'Won') return 'Win';
  return stage;
}

function toPipelineProject(project: ApiProject): PipelineProject {
  const normalizedStage = project.stage === 'Approved' ? 'PO Expected' : project.stage;
  return {
    id: project.id,
    name: project.name,
    city: project.city,
    country: project.country,
    developer: project.developer,
    businessDivision: project.businessDivision,
    stage: toStage(normalizedStage),
    value: project.valueAed,
    valueLocal: project.valueLocal,
    currencyCode: project.currencyCode,
    valueAed: project.valueAed,
    itemQuantity: project.itemQuantity,
    specThickness: project.specThickness ?? '',
    specCore: project.specCore ?? '',
    specPaintType: project.specPaintType ?? '',
    itemName: project.itemName,
    lat: project.lat,
    lng: project.lng,
    probability: project.probability,
    daysInStage: project.daysInStage,
    competitor: project.competitor,
    lossReason: project.lossReason ?? null,
    owner: project.owner,
    regionalManagerId: project.regionalManagerId,
    regionalManagerName: project.regionalManagerName,
    managerId: project.managerId,
    managerName: project.managerName,
    salesRepIds: project.salesRepIds,
    salesRepNames: project.salesRepNames,
    convertedById: project.convertedById,
    convertedByName: project.convertedByName,
    updatedAt: project.updatedAt,
  };
}

function toStage(stage: string): Stage {
  const all = [...PIPELINE_STAGES];
  return (all.includes(stage as Stage) ? stage : 'Lead Identified') as Stage;
}
