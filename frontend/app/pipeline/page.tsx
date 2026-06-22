'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { GripVertical, Filter, Plus, Search, Flame, Clock, Pencil, Trash2, X, MapPin } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { LocationPickerMap } from '@/components/map/LocationPickerMap';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { STAGES, type Stage } from '@/lib/data';
import { listManagers, listMyTeam, listRegionalManagers, listUsers, type TeamMember, type UserListItem } from '@/lib/auth-api';
import {
  createProject as createProjectApi,
  deleteProject as deleteProjectApi,
  listProjects as listProjectsApi,
  updateProject as updateProjectApi,
  type ApiProject,
} from '@/lib/projects-api';
import { cn, formatAED } from '@/lib/utils';
import { ProjectCommercialFields } from '@/components/projects/ProjectCommercialFields';
import {
  commercialSpecsComplete,
  formatProjectSpecs,
  formatSpecsSummary,
} from '@/lib/project-specs';

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
  itemQuantity: string;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  lat: string;
  lng: string;
  stage: Stage;
  probability: string;
  competitor: string;
  regionalManagerId: string;
  managerId: string;
  salesRepIds: string[];
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
  owner: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
  managerId: string | null;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
  updatedAt: string;
};

const PIPELINE_STAGES: Stage[] = [...STAGES, 'Lost', 'Won'];
const PIPELINE_VISIBLE_STAGES: Stage[] = PIPELINE_STAGES.filter((stage) => stage !== 'Approved');
const BUSINESS_DIVISIONS = ['alubond architecture', 'alubond transport', 'uniqube'] as const;
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', "Cote d'Ivoire", 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'DR Congo', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia',
  'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands',
  'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
  'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
  'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan',
  'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste',
  'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
] as const;

const EMPTY_FORM: ProjectFormState = {
  name: '',
  city: '',
  country: '',
  developer: '',
  businessDivision: '',
  value: '',
  itemQuantity: '',
  specThickness: '',
  specCore: '',
  specPaintType: '',
  lat: '',
  lng: '',
  stage: 'Lead Identified',
  probability: '',
  competitor: '',
  regionalManagerId: '',
  managerId: '',
  salesRepIds: [],
};

export default function PipelinePage() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<PipelineProject[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [mobileStage, setMobileStage] = useState<Stage>('Lead Identified');
  const [mobileQuery, setMobileQuery] = useState('');
  const [desktopQuery, setDesktopQuery] = useState('');
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
    itemQuantity: string;
    specThickness: string;
    specCore: string;
    specPaintType: string;
    error: string | null;
    saving: boolean;
  } | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isRegionalManager = user?.role === 'REGIONAL_MANAGER';
  const canCreateProject = isAdmin || isManager || isRegionalManager || user?.role === 'CEO';
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

  function totalFor(stage: Stage) {
    return items.filter((p) => p.stage === stage).reduce((a, b) => a + b.value, 0);
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

  function requiresCommercialDetails(stage: Stage) {
    return ['Tender', 'Negotiation', 'Approved', 'PO Expected', 'Won', 'Lost'].includes(stage);
  }

  function validateCommercialInput(input: {
    value: string;
    itemQuantity: string;
    specThickness: string;
    specCore: string;
    specPaintType: string;
  }): string | null {
    const nextValue = Number(input.value);
    const nextItemQuantity = Number(input.itemQuantity);
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
      itemQuantity: number;
      specThickness: string;
      specCore: string;
      specPaintType: string;
    },
  ) {
    const itemName = formatProjectSpecs(commercial.specThickness, commercial.specCore, commercial.specPaintType);
    const nextDaysInStage = project.stage === nextStage ? project.daysInStage : 1;
    setItems((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              stage: nextStage,
              daysInStage: nextDaysInStage,
              value: commercial.value,
              itemQuantity: commercial.itemQuantity,
              specThickness: commercial.specThickness,
              specCore: commercial.specCore,
              specPaintType: commercial.specPaintType,
              itemName,
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
      valueAed: commercial.value,
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
      regionalManagerId: project.regionalManagerId,
      managerId: project.managerId,
      salesRepIds: project.salesRepIds,
    });
  }

  async function refreshProjects(activeToken: string) {
    setProjectsLoading(true);
    setProjectsError(null);
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
                  operationLocation: 'Not set',
                  yearlyTarget: null,
                  isActive: true,
                  createdAt: new Date(0).toISOString(),
                  lastLocationPingAt: null,
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
                  operationLocation: 'Not set',
                  yearlyTarget: null,
                  isActive: true,
                  createdAt: new Date(0).toISOString(),
                  lastLocationPingAt: null,
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
                  operationLocation: 'Not set',
                  yearlyTarget: null,
                  isActive: true,
                  createdAt: new Date(0).toISOString(),
                  lastLocationPingAt: null,
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
                  operationLocation: 'Not set',
                  yearlyTarget: null,
                  isActive: true,
                  createdAt: new Date(0).toISOString(),
                  lastLocationPingAt: null,
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
            operationLocation: 'Not set',
            yearlyTarget: null,
            isActive: true,
            createdAt: new Date(0).toISOString(),
            lastLocationPingAt: null,
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
  }, [token, canCreateProject, isAdmin, isManager, isRegionalManager, user]);

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
    if (!dragging) return;
    const dragged = items.find((item) => item.id === dragging);
    if (!dragged) {
      setDragging(null);
      return;
    }
    requestStageChange(dragged, stage);
    setDragging(null);
  }

  function requestStageChange(project: PipelineProject, stage: Stage) {
    if (requiresCommercialDetails(stage)) {
      setCommercialPrompt({
        projectId: project.id,
        targetStage: stage,
        value: String(project.value > 0 ? project.value : ''),
        itemQuantity: String(project.itemQuantity > 0 ? project.itemQuantity : ''),
        specThickness: project.specThickness ?? '',
        specCore: project.specCore ?? '',
        specPaintType: project.specPaintType ?? '',
        error: null,
        saving: false,
      });
      return;
    }
    void persistProjectStageUpdate(project, stage, {
      value: project.value,
      itemQuantity: project.itemQuantity,
      specThickness: project.specThickness,
      specCore: project.specCore,
      specPaintType: project.specPaintType,
    }).catch(() => {
      setProjectsError('Failed to update stage. Please retry.');
    });
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

    const nextValue = Number(commercialPrompt.value);
    const nextItemQuantity = Math.round(Number(commercialPrompt.itemQuantity));

    setCommercialPrompt((prev) => (prev ? { ...prev, error: null, saving: true } : prev));
    try {
      await persistProjectStageUpdate(project, commercialPrompt.targetStage, {
        value: nextValue,
        itemQuantity: nextItemQuantity,
        specThickness: commercialPrompt.specThickness,
        specCore: commercialPrompt.specCore,
        specPaintType: commercialPrompt.specPaintType,
      });
      closeCommercialPrompt();
    } catch {
      setCommercialPrompt((prev) =>
        prev ? { ...prev, saving: false, error: 'Failed to update stage. Please retry.' } : prev,
      );
    }
  }

function normalizeOptionalId(value: string): string | null {
  return value.trim() ? value : null;
}

function buildProjectAssignmentPayload(form: ProjectFormState, isManager: boolean, isRegionalManager: boolean, userId?: string) {
  return {
    regionalManagerId:
      isRegionalManager && userId
        ? userId
        : normalizeOptionalId(form.regionalManagerId),
    managerId: isManager && userId ? userId : normalizeOptionalId(form.managerId),
    salesRepIds: form.salesRepIds,
  };
}

  function openCreateForm() {
    if (!canCreateProject) return;
    setEditingId(null);
    setFormError(null);
    setLocationQuery('');
    setLocationSearchError(null);
    setForm({
      ...EMPTY_FORM,
      regionalManagerId: isRegionalManager && user?.id ? user.id : '',
      managerId: isManager && user?.id ? user.id : '',
    });
    setIsFormOpen(true);
  }

  function openEditForm(project: PipelineProject) {
    if (!canCreateProject) return;
    const existing = assignments[project.id];
    setEditingId(project.id);
    setFormError(null);
    setLocationQuery(project.city);
    setLocationSearchError(null);
    setForm({
      name: project.name,
      city: project.city,
      country: project.country,
      developer: project.developer,
      businessDivision: project.businessDivision ?? '',
      value: String(project.value),
      itemQuantity: String(project.itemQuantity),
      specThickness: project.specThickness ?? '',
      specCore: project.specCore ?? '',
      specPaintType: project.specPaintType ?? '',
      lat: String(project.lat),
      lng: String(project.lng),
      stage: project.stage,
      probability: String(project.probability),
      competitor: project.competitor ?? '',
      regionalManagerId: existing?.regionalManagerId ?? (isRegionalManager && user?.id ? user.id : ''),
      managerId: existing?.managerId ?? (isManager && user?.id ? user.id : ''),
      salesRepIds: existing?.salesRepIds ?? [],
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setFormError(null);
    setLocationQuery('');
    setLocationSearchError(null);
    setForm({
      ...EMPTY_FORM,
      regionalManagerId: isRegionalManager && user?.id ? user.id : '',
      managerId: isManager && user?.id ? user.id : '',
    });
  }

  async function deleteProjectById(project: PipelineProject) {
    if (!isAdmin || !token) return;
    const confirmed = window.confirm(
      `Delete project "${project.name}"? This will remove all activities, stakeholders, and follow-ups. This cannot be undone.`
    );
    if (!confirmed) return;

    setProjectsError(null);
    try {
      await deleteProjectApi(token, project.id);
      if (editingId === project.id) {
        closeForm();
      }
      await refreshProjects(token);
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : 'Failed to delete project.');
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
    const country = form.country.trim();
    const developer = form.developer.trim();
    const value = Number(form.value);
    const itemQuantity = Number(form.itemQuantity);
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const probability = Math.max(0, Math.min(100, Number(form.probability)));
    const businessDivision = form.businessDivision || null;
    const normalizedValue = Number.isFinite(value) && value >= 0 ? value : 0;
    const normalizedItemQuantity = Number.isFinite(itemQuantity) && itemQuantity > 0 ? Math.round(itemQuantity) : 0;
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
    const selectedReps = repsForSelectedManager.filter((rep) => form.salesRepIds.includes(rep.id));
    const assignmentPayload = buildProjectAssignmentPayload(form, isManager, isRegionalManager, user?.id);

    if (!name || !city) {
      setFormError('Fill project name and city.');
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

    const normalizedLat = Number.isFinite(lat) ? lat : 0;
    const normalizedLng = Number.isFinite(lng) ? lng : 0;
    const normalizedProbability = Number.isFinite(probability) ? probability : 0;

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
          valueAed: normalizedValue,
          itemName: normalizedItemName,
          itemQuantity: normalizedItemQuantity,
          specThickness: normalizedSpecs.specThickness,
          specCore: normalizedSpecs.specCore,
          specPaintType: normalizedSpecs.specPaintType,
          lat: normalizedLat,
          lng: normalizedLng,
          probability: normalizedProbability,
          daysInStage: nextDaysInStage,
          competitor: form.competitor.trim() || null,
          ...assignmentPayload,
          salesRepIds: selectedReps.map((rep) => rep.id),
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
        valueAed: normalizedValue,
        itemName: normalizedItemName,
        itemQuantity: normalizedItemQuantity,
        specThickness: normalizedSpecs.specThickness,
        specCore: normalizedSpecs.specCore,
        specPaintType: normalizedSpecs.specPaintType,
        lat: normalizedLat,
        lng: normalizedLng,
        probability: normalizedProbability,
        daysInStage: 1,
        competitor: form.competitor.trim() || null,
        ...assignmentPayload,
        salesRepIds: selectedReps.map((rep) => rep.id),
      });
      await refreshProjects(token);
      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create project.');
    }
  }

  const mobileStageItems = items
    .filter((project) => project.stage === mobileStage)
    .filter((project) => matchesProjectQuery(project, mobileQuery));

  const desktopFilteredItems = items.filter((project) => matchesProjectQuery(project, desktopQuery));
  const desktopVisibleStages = desktopFocusedStage ? [desktopFocusedStage] : PIPELINE_VISIBLE_STAGES;

  return (
    <>
      <div className="px-4 lg:px-8 pt-6 lg:pt-8 pb-4 flex justify-end">
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-3" />
            <input
              value={desktopQuery}
              onChange={(event) => setDesktopQuery(event.target.value)}
              className="pl-9 pr-3 h-9 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm placeholder:text-3 w-64"
              placeholder="Filter projects…"
            />
          </div>
          {canCreateProject && (
            <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreateForm}>Add project</Button>
          )}
        </div>
      </div>

      {projectsLoading && <p className="px-4 lg:px-8 pb-2 text-sm text-3">Loading projects...</p>}
      {projectsError && <p className="px-4 lg:px-8 pb-2 text-sm text-rose-600">{projectsError}</p>}
      {!projectsLoading && !projectsError && items.length === 0 && (
        <p className="px-4 lg:px-8 pb-2 text-sm text-3">No projects yet. Create your first project.</p>
      )}

      <div className="md:hidden px-4 pb-8 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-3" />
            <input
              value={mobileQuery}
              onChange={(event) => setMobileQuery(event.target.value)}
              placeholder="Search in this stage..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
            />
          </div>
          {canCreateProject && (
            <Button variant="primary" size="sm" onClick={openCreateForm} icon={<Plus className="h-4 w-4" />}>
              Add
            </Button>
          )}
        </div>

        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <div className="inline-flex gap-2 min-w-max">
            {PIPELINE_VISIBLE_STAGES.map((stage) => {
              const count = items.filter((project) => project.stage === stage).length;
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
          <p className="text-sm font-semibold">{formatAED(totalFor(mobileStage), true)}</p>
        </div>

        <div className="space-y-2">
          {mobileStageItems.map((project) => (
            <article key={`mobile-${project.id}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-soft">
              <div className="flex items-start gap-2">
                <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold tracking-tight leading-snug line-clamp-2">{project.name}</h4>
                  <p className="mt-1 text-[11px] text-3 truncate">{project.city} · {project.developer}</p>
                </Link>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => openEditForm(project)}
                    className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                    aria-label={`Edit ${project.name}`}
                    disabled={!canCreateProject}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => void deleteProjectById(project)}
                      className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-3 hover:text-rose-600 hover:bg-rose-500/10"
                      aria-label={`Delete ${project.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-base font-bold tracking-tight num-tabular">{formatAED(project.value, true)}</p>
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
                  className="h-9 w-full px-2.5 rounded-lg bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-xs"
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
          {mobileStageItems.length === 0 && (
            <div className="text-center py-8 text-xs text-3 border border-dashed border-[var(--border-strong)] rounded-xl">
              No projects in {stageTitle(mobileStage)}.
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block px-4 lg:px-8">
        <div className="overflow-x-auto -mx-4 lg:-mx-8 px-4 lg:px-8 pb-8">
          <div className="flex gap-3 min-w-max">
            {desktopVisibleStages.map((stage) => {
              const cards = desktopFilteredItems.filter((p) => p.stage === stage);
              return (
                <div
                  key={stage}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(stage)}
                  className="w-[300px] shrink-0 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] flex flex-col"
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
                    {cards.map((p) => (
                      <article
                        key={p.id}
                        draggable
                        onDragStart={() => setDragging(p.id)}
                        onDragEnd={() => setDragging(null)}
                        className={cn(
                          'group surface rounded-xl border border-[var(--border)] p-3 shadow-soft transition-all cursor-grab active:cursor-grabbing',
                          dragging === p.id ? 'opacity-50' : 'hover:shadow-card hover:-translate-y-0.5',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <Link href={`/projects/${p.id}`} className="block flex-1 min-w-0">
                                <h4 className="text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
                                  {p.name}
                                </h4>
                              </Link>
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(p)}
                                  className="h-6 w-6 rounded-md inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                                  aria-label={`Edit ${p.name}`}
                                  disabled={!canCreateProject}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => void deleteProjectById(p)}
                                    className="h-6 w-6 rounded-md inline-flex items-center justify-center text-3 hover:text-rose-600 hover:bg-rose-500/10"
                                    aria-label={`Delete ${p.name}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="mt-1 text-[11px] text-3 truncate">{p.city} · {p.developer}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm font-bold tracking-tight num-tabular">{formatAED(p.value, true)}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-3 truncate max-w-[110px]">
                                  {(() => {
                                    const specs = formatSpecsSummary(p);
                                    const quantity = p.itemQuantity > 0 ? `${p.itemQuantity} m²` : '';
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
                            <div className="mt-2.5 flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-[10px] text-3">Manager</p>
                                <p className="text-[11px] font-medium truncate">{p.managerName}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="chip !text-[9px] !px-1.5 !py-0">sales rep-{p.salesRepNames.length}</span>
                                {p.value > 5_000_000 && <Flame className="h-3 w-3 text-amber-500" />}
                                {p.competitor && <span className="chip !text-[9px] !px-1.5 !py-0">vs {p.competitor}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                    {cards.length === 0 && (
                      <div className="text-center py-10 text-[11px] text-3 border border-dashed border-[var(--border-strong)] rounded-xl">
                        Drop projects here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
                itemQuantity={commercialPrompt.itemQuantity}
                specThickness={commercialPrompt.specThickness}
                specCore={commercialPrompt.specCore}
                specPaintType={commercialPrompt.specPaintType}
                onValueChange={(value) =>
                  setCommercialPrompt((prev) => (prev ? { ...prev, value, error: null } : prev))
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-[min(1400px,100%)] h-[calc(100vh-2rem)] mx-auto surface border border-[var(--border)] rounded-2xl shadow-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">{editingId ? 'Edit project' : 'Add project'}</h2>
              <button
                onClick={closeForm}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[430px,1fr]">
              <div className="min-h-0 overflow-y-auto p-4 space-y-3 border-b xl:border-b-0 xl:border-r border-[var(--border)]">
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Project name"
                  required
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                />
                <input
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  required
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                />
                <input
                  value={form.developer}
                  onChange={(e) => setForm((prev) => ({ ...prev, developer: e.target.value }))}
                  placeholder="Developer"
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                />
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
                <input
                  list="project-country-options"
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder="Select or search country"
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                />
                <datalist id="project-country-options">
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country} />
                  ))}
                </datalist>
                <select
                  value={form.stage}
                  onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value as Stage }))}
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                >
                  {PIPELINE_VISIBLE_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stageTitle(stage)}
                    </option>
                  ))}
                </select>
                <ProjectCommercialFields
                  idPrefix="project-form"
                  value={form.value}
                  itemQuantity={form.itemQuantity}
                  specThickness={form.specThickness}
                  specCore={form.specCore}
                  specPaintType={form.specPaintType}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, value }))}
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
                <input
                  value={form.competitor}
                  onChange={(e) => setForm((prev) => ({ ...prev, competitor: e.target.value }))}
                  placeholder="Competitor (optional)"
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                />
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
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={closeForm}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm">{editingId ? 'Save changes' : 'Create project'}</Button>
                </div>
              </div>

              <div className="min-h-0 p-4 flex flex-col">
                <div className="mb-2 flex gap-2">
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
                    className="h-9 flex-1 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void searchLocation()}
                    disabled={locationSearchLoading}
                  >
                    {locationSearchLoading ? 'Searching...' : 'Go'}
                  </Button>
                </div>
                <p className="text-xs text-2 mb-2 inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Click map or drag marker to set location
                </p>
                <div className="flex-1 min-h-[340px] rounded-2xl overflow-hidden border border-[var(--border)]">
                  <LocationPickerMap
                    lat={form.lat.trim() === '' ? null : Number(form.lat)}
                    lng={form.lng.trim() === '' ? null : Number(form.lng)}
                    onPick={pickLocationFromMap}
                    heightClassName="h-full"
                  />
                </div>
                {locationSearchError && <p className="mt-2 text-xs text-rose-600">{locationSearchError}</p>}
              </div>
            </form>
          </div>
        </div>
      )}
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
    owner: project.owner,
    regionalManagerId: project.regionalManagerId,
    regionalManagerName: project.regionalManagerName,
    managerId: project.managerId,
    managerName: project.managerName,
    salesRepIds: project.salesRepIds,
    salesRepNames: project.salesRepNames,
    updatedAt: project.updatedAt,
  };
}

function toStage(stage: string): Stage {
  const all = [...PIPELINE_STAGES];
  return (all.includes(stage as Stage) ? stage : 'Lead Identified') as Stage;
}
