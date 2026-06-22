'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Pencil, Search, ShieldAlert, User, UserPlus, X } from 'lucide-react';
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';

import { useAuth } from '@/components/auth/AuthContext';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  createUser,
  getUserLocationAttendance,
  getUserLocationRoute,
  listRegionalManagers,
  listCeos,
  listUsers,
  updateUser,
  ManagerOption,
  UserListItem,
  type UserLocationAttendanceDay,
  type UserLocationRoute
} from '@/lib/auth-api';
import { cn } from '@/lib/utils';

type Role = 'SALES_REP' | 'MANAGER' | 'REGIONAL_MANAGER' | 'CEO' | 'ADMIN';

const ROLES: Role[] = ['SALES_REP', 'MANAGER', 'REGIONAL_MANAGER', 'CEO', 'ADMIN'];
const DIRECT_REGIONAL_MANAGER = '__direct__';
const PAGE_SIZE = 25;
const ROLE_SORT_ORDER: Record<Role, number> = {
  ADMIN: 0,
  CEO: 1,
  REGIONAL_MANAGER: 2,
  MANAGER: 3,
  SALES_REP: 4,
};

export default function UsersPage() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<UserListItem[]>([]);
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<ManagerOption[]>([]);
  const [ceos, setCeos] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [attendanceUser, setAttendanceUser] = useState<UserListItem | null>(null);
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [attendanceDays, setAttendanceDays] = useState<UserLocationAttendanceDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [route, setRoute] = useState<UserLocationRoute | null>(null);
  const [selectedPingId, setSelectedPingId] = useState<string | null>(null);
  const [selectedPingFocusTick, setSelectedPingFocusTick] = useState(0);
  const [selectedDistanceProjectId, setSelectedDistanceProjectId] = useState<string | null>(null);
  const [selectedCompanyProjectId, setSelectedCompanyProjectId] = useState<string | null>(null);
  const [selectedCompanyFocusTick, setSelectedCompanyFocusTick] = useState(0);
  const [assignedZonesOpen, setAssignedZonesOpen] = useState(false);
  const [showAllPings, setShowAllPings] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [role, setRole] = useState<Role>('SALES_REP');
  const [managerId, setManagerId] = useState('');
  const [regionalManagerId, setRegionalManagerId] = useState('');
  const [reportsToId, setReportsToId] = useState('');
  const [regionsInput, setRegionsInput] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [operationLocation, setOperationLocation] = useState('');
  const [yearlyTarget, setYearlyTarget] = useState('');
  const [password, setPassword] = useState('');
  const [canSetBusinessDivision, setCanSetBusinessDivision] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [regionalManagerFilter, setRegionalManagerFilter] = useState('ALL');
  const [managerFilter, setManagerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'live' | 'offline'>('ALL');
  const [page, setPage] = useState(1);

  const isAdmin = user?.role === 'ADMIN';

  async function loadData() {
    if (!token || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [usersData, regionalManagersData, ceosData] = await Promise.all([
        listUsers(token),
        listRegionalManagers(token),
        listCeos(token),
      ]);
      setItems(usersData);
      setManagers(usersData.filter((entry) => entry.role === 'MANAGER'));
      setRegionalManagers(regionalManagersData);
      setCeos(ceosData);
    } catch {
      setMessage('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      admins: items.filter((u) => u.role === 'ADMIN').length,
      regionalManagers: items.filter((u) => u.role === 'REGIONAL_MANAGER').length,
      managers: items.filter((u) => u.role === 'MANAGER').length,
      reps: items.filter((u) => u.role === 'SALES_REP').length
    };
  }, [items]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items
      .filter((entry) => {
        if (query) {
          const haystack = `${entry.firstName} ${entry.lastName} ${entry.email}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (roleFilter !== 'ALL' && entry.role !== roleFilter) return false;
        if (regionalManagerFilter !== 'ALL') {
          const regionalId = effectiveRegionalManagerId(entry, items);
          if (regionalId !== regionalManagerFilter) return false;
        }
        if (managerFilter !== 'ALL') {
          if (entry.role === 'SALES_REP' && entry.managerId !== managerFilter) return false;
          if (entry.role === 'MANAGER' && entry.id !== managerFilter) return false;
          if (entry.role !== 'SALES_REP' && entry.role !== 'MANAGER') return false;
        }
        if (statusFilter !== 'ALL') {
          const live = isUserLive(entry.lastLocationPingAt, entry.isActive);
          if (statusFilter === 'live' && !live) return false;
          if (statusFilter === 'offline' && live) return false;
        }
        return true;
      })
      .sort((a, b) => compareUsersByHierarchy(a, b));
  }, [items, searchQuery, roleFilter, regionalManagerFilter, managerFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, regionalManagerFilter, managerFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const todayDateKey = useMemo(() => formatLocalDateKey(new Date()), []);
  const filteredRoutePoints = useMemo(
    () => filterMovementPoints(route?.points ?? [], 120),
    [route]
  );
  const displayedRoutePoints = useMemo(
    () => (showAllPings ? (route?.points ?? []) : filteredRoutePoints),
    [showAllPings, route, filteredRoutePoints]
  );
  const latestRoutePing = useMemo(
    () => (route && route.points.length > 0 ? route.points[route.points.length - 1] : null),
    [route]
  );
  const selectedDistanceProject = useMemo(
    () => route?.assignedProjects.find((project) => project.projectId === selectedDistanceProjectId) ?? null,
    [route, selectedDistanceProjectId]
  );
  const selectedCompanyProject = useMemo(
    () => route?.assignedProjects.find((project) => project.projectId === selectedCompanyProjectId) ?? null,
    [route, selectedCompanyProjectId]
  );
  const latestPingIsLive = useMemo(() => {
    if (!latestRoutePing) return false;
    const latestMs = new Date(latestRoutePing.recordedAt).getTime();
    if (!Number.isFinite(latestMs)) return false;
    return Date.now() - latestMs <= 60 * 60 * 1000;
  }, [latestRoutePing]);

  const managersUnderSelectedRegional = useMemo(() => {
    if (!regionalManagerId) return [];
    return managers.filter((manager) => manager.regionalManagerId === regionalManagerId);
  }, [managers, regionalManagerId]);

  async function onSubmitUser(event: FormEvent) {
    event.preventDefault();
    if (!token || !isAdmin) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const parsedYearlyTarget = yearlyTarget.trim() ? Number(yearlyTarget) : null;
      const parsedRegions = regionsInput
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (role !== 'ADMIN' && (!parsedYearlyTarget || parsedYearlyTarget <= 0 || Number.isNaN(parsedYearlyTarget))) {
        throw new Error('Yearly sales target is required for all non-admin users.');
      }
      if (role === 'MANAGER' && !regionalManagerId) {
        throw new Error('Manager must be assigned under a regional manager.');
      }
      if (role === 'SALES_REP' && managerId !== DIRECT_REGIONAL_MANAGER && !managerId && !regionalManagerId) {
        throw new Error('Sales rep must be assigned under a manager or regional manager.');
      }
      if (role === 'SALES_REP' && managerId === DIRECT_REGIONAL_MANAGER && !regionalManagerId) {
        throw new Error('Select a regional manager for direct reporting.');
      }
      if (role === 'REGIONAL_MANAGER' && parsedRegions.length === 0) {
        throw new Error('Regional manager must have at least one region.');
      }
      if (role === 'REGIONAL_MANAGER' && !reportsToId) {
        throw new Error('Regional manager must be assigned under CEO.');
      }
      if (editingUserId) {
        await updateUser(token, editingUserId, {
          firstName,
          lastName,
          email,
          role,
          managerId:
            role === 'SALES_REP'
              ? managerId === DIRECT_REGIONAL_MANAGER
                ? null
                : normalizeOptionalId(managerId)
              : null,
          regionalManagerId:
            role === 'MANAGER' || role === 'SALES_REP' ? normalizeOptionalId(regionalManagerId) : null,
          reportsToId: role === 'REGIONAL_MANAGER' ? normalizeOptionalId(reportsToId) : null,
          regions: role === 'REGIONAL_MANAGER' ? parsedRegions : [],
          operationLocation,
          yearlyTarget: role !== 'ADMIN' ? parsedYearlyTarget : null,
          canSetBusinessDivision: role === 'REGIONAL_MANAGER' ? canSetBusinessDivision : false,
          password: password.trim() ? password : undefined,
        });
      } else {
      await createUser(token, {
        firstName,
        lastName,
        email,
        password,
        role,
          managerId:
            role === 'SALES_REP'
              ? managerId === DIRECT_REGIONAL_MANAGER
                ? null
                : normalizeOptionalId(managerId)
              : null,
          regionalManagerId:
            role === 'MANAGER' || role === 'SALES_REP' ? normalizeOptionalId(regionalManagerId) : null,
          reportsToId: role === 'REGIONAL_MANAGER' ? normalizeOptionalId(reportsToId) : null,
          regions: role === 'REGIONAL_MANAGER' ? parsedRegions : [],
          operationLocation,
          yearlyTarget: role !== 'ADMIN' ? parsedYearlyTarget : null,
          canSetBusinessDivision: role === 'REGIONAL_MANAGER' ? canSetBusinessDivision : false,
      });
      }
      setFirstName('');
      setLastName('');
      setEmail('');
      setOperationLocation('');
      setYearlyTarget('');
      setPassword('');
      setCanSetBusinessDivision(false);
      setManagerId('');
      setRegionalManagerId('');
      setReportsToId('');
      setRegionsInput('');
      setEditingUserId(null);
      setUserDialogOpen(false);
      await loadData();
      setMessage(editingUserId ? 'User updated successfully.' : 'User created successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (editingUserId ? 'Failed to update user.' : 'Failed to create user.'));
    } finally {
      setSaving(false);
    }
  }

  function openCreateUserDialog() {
    setEditingUserId(null);
    setRole('SALES_REP');
    setManagerId('');
    setRegionalManagerId('');
    setReportsToId('');
    setRegionsInput('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setOperationLocation('');
    setYearlyTarget('');
    setPassword('');
    setCanSetBusinessDivision(false);
    setUserDialogOpen(true);
    setMessage(null);
  }

  function openEditUserDialog(entry: UserListItem) {
    setEditingUserId(entry.id);
    setRole(entry.role as Role);
    if (entry.role === 'SALES_REP') {
      if (entry.managerId) {
        setManagerId(entry.managerId);
        const manager = items.find((user) => user.id === entry.managerId);
        setRegionalManagerId(entry.regionalManagerId ?? manager?.regionalManagerId ?? '');
      } else if (entry.regionalManagerId) {
        setManagerId(DIRECT_REGIONAL_MANAGER);
        setRegionalManagerId(entry.regionalManagerId);
      } else {
        setManagerId('');
        setRegionalManagerId('');
      }
    } else {
      setManagerId('');
      setRegionalManagerId(entry.role === 'MANAGER' ? entry.regionalManagerId ?? '' : '');
    }
    setReportsToId(entry.role === 'REGIONAL_MANAGER' ? entry.reportsToId ?? '' : '');
    setRegionsInput(entry.role === 'REGIONAL_MANAGER' ? entry.regions.join(', ') : '');
    setFirstName(entry.firstName);
    setLastName(entry.lastName);
    setEmail(entry.email);
    setOperationLocation(entry.operationLocation);
    setYearlyTarget(entry.yearlyTarget != null ? String(entry.yearlyTarget) : '');
    setCanSetBusinessDivision(entry.role === 'REGIONAL_MANAGER' ? entry.canSetBusinessDivision : false);
    setPassword('');
    setUserDialogOpen(true);
    setMessage(null);
  }

  async function openAttendance(entry: UserListItem) {
    if (!token) return;
    setAttendanceUser(entry);
    setAttendanceError(null);
    setAttendanceLoading(true);
    setSelectedDate(null);
    setRoute(null);
    setSelectedPingId(null);
    setSelectedPingFocusTick(0);
    setSelectedDistanceProjectId(null);
    setSelectedCompanyProjectId(null);
    setSelectedCompanyFocusTick(0);
    setShowAllPings(false);
    try {
      const data = await getUserLocationAttendance(token, entry.id, attendanceMonth);
      setAttendanceDays(data.days);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Failed to load attendance.");
      setAttendanceDays([]);
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function loadRouteForDate(date: string) {
    if (!token || !attendanceUser) return;
    setSelectedDate(date);
    setRouteLoading(true);
    setAttendanceError(null);
    setSelectedPingId(null);
    setSelectedPingFocusTick(0);
    setSelectedDistanceProjectId(null);
    setSelectedCompanyProjectId(null);
    setSelectedCompanyFocusTick(0);
    setShowAllPings(false);
    try {
      const data = await getUserLocationRoute(token, attendanceUser.id, date);
      setRoute(data);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Failed to load route.");
      setRoute(null);
    } finally {
      setRouteLoading(false);
    }
  }

  async function refreshAttendanceMonth(nextMonth: string) {
    if (!token || !attendanceUser) return;
    setAttendanceMonth(nextMonth);
    setAttendanceLoading(true);
    setSelectedDate(null);
    setRoute(null);
    setSelectedPingId(null);
    setSelectedPingFocusTick(0);
    setSelectedDistanceProjectId(null);
    setSelectedCompanyProjectId(null);
    setSelectedCompanyFocusTick(0);
    setShowAllPings(false);
    setAttendanceError(null);
    try {
      const data = await getUserLocationAttendance(token, attendanceUser.id, nextMonth);
      setAttendanceDays(data.days);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Failed to load attendance.");
      setAttendanceDays([]);
    } finally {
      setAttendanceLoading(false);
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
              <p className="text-sm text-2 mt-1">Only admins can create and manage users.</p>
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
        title="User management"
        subtitle="Create regional managers, managers, sales reps, CEO users and additional admins."
      />

      <section className="px-4 lg:px-8 pb-8">
        <Card>
          <CardHeader
            title="Team directory"
            subtitle={`${stats.total} total users`}
            action={
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <Badge tone="brand">Admins {stats.admins}</Badge>
                <Badge tone="success">Regional Managers {stats.regionalManagers}</Badge>
                <Badge tone="warning">Managers {stats.managers}</Badge>
                <Badge tone="info">Sales reps {stats.reps}</Badge>
                <Button type="button" variant="primary" size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={openCreateUserDialog}>
                  Create user
                </Button>
              </div>
            }
          />
          <div className="px-5 pb-5 space-y-4">
            {loading ? (
              <p className="text-sm text-3">Loading users...</p>
            ) : (
              <>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-3 pointer-events-none" />
                    <input
                      type="search"
                      placeholder="Search name or email"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value as 'ALL' | Role)}
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                    >
                      <option value="ALL">All roles</option>
                      {ROLES.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <select
                      value={regionalManagerFilter}
                      onChange={(event) => setRegionalManagerFilter(event.target.value)}
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                    >
                      <option value="ALL">All regional managers</option>
                      {regionalManagers.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.firstName} {entry.lastName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={managerFilter}
                      onChange={(event) => setManagerFilter(event.target.value)}
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                    >
                      <option value="ALL">All managers</option>
                      {managers.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.firstName} {entry.lastName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'live' | 'offline')}
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                    >
                      <option value="ALL">All statuses</option>
                      <option value="live">Live</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs text-3">
                  Showing {paginatedUsers.length} of {filteredUsers.length} users
                  {filteredUsers.length !== items.length ? ` (filtered from ${items.length})` : ''}
                </p>

                {filteredUsers.length === 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-8 text-center">
                    <p className="text-sm text-2">No users match your filters.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border)]">
                      <table className="w-full min-w-[920px] text-sm">
                        <thead className="bg-[var(--surface-2)]/70 text-left text-[11px] uppercase tracking-wide text-3">
                          <tr>
                            <th className="px-4 py-3 font-medium">User</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Reports to</th>
                            <th className="px-4 py-3 font-medium">Ops / Regions</th>
                            <th className="px-4 py-3 font-medium">Target</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {paginatedUsers.map((entry) => {
                            const live = isUserLive(entry.lastLocationPingAt, entry.isActive);
                            return (
                              <tr key={entry.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-[var(--text)]">
                                    {entry.firstName} {entry.lastName}
                                  </p>
                                  <p className="text-xs text-3 truncate max-w-[220px]">{entry.email}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge tone={roleBadgeTone(entry.role as Role)}>{entry.role.replace('_', ' ')}</Badge>
                                  {entry.role === 'REGIONAL_MANAGER' && entry.canSetBusinessDivision ? (
                                    <p className="mt-1 text-[10px] text-3">Business division access</p>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3 text-xs text-2 max-w-[180px]">{getReportsToLabel(entry)}</td>
                                <td className="px-4 py-3 text-xs text-2 max-w-[180px]">
                                  {entry.role === 'REGIONAL_MANAGER' && entry.regions.length > 0
                                    ? entry.regions.join(', ')
                                    : entry.operationLocation || 'Not set'}
                                </td>
                                <td className="px-4 py-3 text-xs num-tabular">
                                  {entry.yearlyTarget != null ? `AED ${formatAed(entry.yearlyTarget)}` : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={cn('text-xs font-medium', live ? 'text-emerald-600' : 'text-rose-600')}>
                                    {live
                                      ? 'Live'
                                      : entry.lastLocationPingAt
                                        ? formatLastSeen(entry.lastLocationPingAt)
                                        : 'No location'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      type="button"
                                      variant="soft"
                                      size="sm"
                                      icon={<CalendarDays className="h-3.5 w-3.5" />}
                                      onClick={() => void openAttendance(entry)}
                                    >
                                      {live ? 'Live' : 'History'}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      icon={<Pencil className="h-3.5 w-3.5" />}
                                      onClick={() => openEditUserDialog(entry)}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden space-y-2">
                      {paginatedUsers.map((entry) => {
                        const live = isUserLive(entry.lastLocationPingAt, entry.isActive);
                        return (
                          <div key={entry.id} className="rounded-xl border border-[var(--border)] p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {entry.firstName} {entry.lastName}
                                </p>
                                <p className="text-xs text-3 truncate">{entry.email}</p>
                              </div>
                              <Badge tone={roleBadgeTone(entry.role as Role)}>{entry.role.replace('_', ' ')}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-2">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-3">Reports to</p>
                                <p>{getReportsToLabel(entry)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-3">Target</p>
                                <p>{entry.yearlyTarget != null ? `AED ${formatAed(entry.yearlyTarget)}` : '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn('text-xs font-medium', live ? 'text-emerald-600' : 'text-rose-600')}>
                                {live ? 'Live' : entry.lastLocationPingAt ? formatLastSeen(entry.lastLocationPingAt) : 'No location'}
                              </span>
                              <div className="inline-flex items-center gap-1.5">
                                <Button type="button" variant="soft" size="sm" onClick={() => void openAttendance(entry)}>
                                  {live ? 'Live' : 'History'}
                                </Button>
                                <Button type="button" variant="secondary" size="sm" onClick={() => openEditUserDialog(entry)}>
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-3">
                          Page {page} of {totalPages}
                        </p>
                        <div className="inline-flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </Card>
        {message && <p className="text-xs text-2 mt-3">{message}</p>}
      </section>

      {userDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-lg mx-auto mt-10 surface border border-[var(--border)] rounded-2xl shadow-card">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">{editingUserId ? 'Edit user' : 'Create user'}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserDialogOpen(false);
                  setEditingUserId(null);
                }}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                aria-label="Close user dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="p-4 space-y-3" onSubmit={onSubmitUser}>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                required
              />
              <input
                placeholder="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                required
              />
            </div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
              required
            />
              <input
                type="text"
                placeholder="Location of operation"
                value={operationLocation}
                onChange={(event) => setOperationLocation(event.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
              required
            />
            <input
              type="password"
                placeholder={editingUserId ? "New password (optional)" : "Password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                minLength={password.trim() ? 8 : undefined}
                required={!editingUserId}
            />
            <select
              value={role}
              onChange={(event) => {
                const nextRole = event.target.value as Role;
                setRole(nextRole);
                if (nextRole !== 'REGIONAL_MANAGER') {
                  setCanSetBusinessDivision(false);
                }
              }}
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
            >
              {ROLES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry.replace('_', ' ')}
                </option>
              ))}
            </select>
            {role === 'MANAGER' && (
              <select
                value={regionalManagerId}
                onChange={(event) => setRegionalManagerId(event.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                required
              >
                <option value="">Assign regional manager</option>
                {regionalManagers.map((regionalManager) => (
                  <option key={regionalManager.id} value={regionalManager.id}>
                    {regionalManager.firstName} {regionalManager.lastName}
                  </option>
                ))}
              </select>
            )}
            {role === 'REGIONAL_MANAGER' && (
              <>
                <select
                  value={reportsToId}
                  onChange={(event) => setReportsToId(event.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                  required
                >
                  <option value="">Assign CEO</option>
                  {ceos.map((ceo) => (
                    <option key={ceo.id} value={ceo.id}>
                      {ceo.firstName} {ceo.lastName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Regions (comma separated)"
                  value={regionsInput}
                  onChange={(event) => setRegionsInput(event.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                  required
                />
                <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={canSetBusinessDivision}
                    onChange={(event) => setCanSetBusinessDivision(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-[var(--text)]">Can set business division</span>
                    <span className="mt-1 block text-xs text-3">
                      Allows this regional manager to choose alubond architecture, alubond transport, or uniqube on projects.
                    </span>
                  </span>
                </label>
              </>
            )}
            {role === 'SALES_REP' && (
              <div className="space-y-2">
                <select
                  value={regionalManagerId}
                  onChange={(event) => {
                    const nextRegionalManagerId = event.target.value;
                    setRegionalManagerId(nextRegionalManagerId);
                    if (
                      managerId &&
                      managerId !== DIRECT_REGIONAL_MANAGER &&
                      !managers.some(
                        (manager) =>
                          manager.id === managerId && manager.regionalManagerId === nextRegionalManagerId
                      )
                    ) {
                      setManagerId('');
                    }
                    if (!nextRegionalManagerId && managerId === DIRECT_REGIONAL_MANAGER) {
                      setManagerId('');
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                  required
                >
                  <option value="">Assign regional manager</option>
                  {regionalManagers.map((regionalManager) => (
                    <option key={regionalManager.id} value={regionalManager.id}>
                      {regionalManager.firstName} {regionalManager.lastName}
                    </option>
                  ))}
                </select>
                <select
                  value={managerId}
                  onChange={(event) => setManagerId(event.target.value)}
                  disabled={!regionalManagerId}
                  className={cn(
                    'w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm',
                    !regionalManagerId && 'opacity-70 cursor-not-allowed'
                  )}
                  required
                >
                  <option value="">
                    {regionalManagerId ? 'Assign manager' : 'Select regional manager first'}
                  </option>
                  <option value={DIRECT_REGIONAL_MANAGER}>Direct regional manager</option>
                  {managersUnderSelectedRegional.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-3">
                  Pick a regional manager first, then choose a manager under them or direct regional reporting.
                </p>
              </div>
            )}
            {role !== 'ADMIN' && (
              <input
                type="number"
                min={1}
                step={1}
                placeholder="Yearly target (AED)"
                value={yearlyTarget}
                onChange={(event) => setYearlyTarget(event.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm"
                required
              />
            )}
              <div className="pt-1 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setUserDialogOpen(false);
                    setEditingUserId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={saving}>
                  {saving ? (editingUserId ? 'Saving...' : 'Creating...') : (editingUserId ? 'Save changes' : 'Create user')}
            </Button>
              </div>
          </form>
          </div>
        </div>
      )}

      {attendanceUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-[min(1320px,100%)] h-[calc(100vh-2rem)] mx-auto surface border border-[var(--border)] rounded-2xl shadow-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Attendance & live route</h2>
                <p className="text-xs text-3 mt-0.5">{attendanceUser.firstName} {attendanceUser.lastName} · {attendanceUser.email}</p>
              </div>
              <button
                onClick={() => setAttendanceUser(null)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                aria-label="Close attendance"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[420px,1fr]">
              <div className="min-h-0 overflow-y-auto p-4 border-b xl:border-b-0 xl:border-r border-[var(--border)]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-3 mr-1">Month</span>
                  <button
                    type="button"
                    onClick={() => void refreshAttendanceMonth(shiftMonth(attendanceMonth, -1))}
                    className="h-9 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium hover:bg-[var(--surface)]"
                  >
                    Previous
                  </button>
                  <div className="h-9 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm inline-flex items-center min-w-[160px] justify-center">
                    {new Date(`${attendanceMonth}-01T00:00:00`).toLocaleDateString('en-AE', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshAttendanceMonth(shiftMonth(attendanceMonth, 1))}
                    className="h-9 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium hover:bg-[var(--surface)]"
                  >
                    Next
                  </button>
                </div>
                {attendanceLoading ? (
                  <p className="text-sm text-3">Loading attendance...</p>
                ) : (
                  <div className="grid grid-cols-7 gap-1.5">
                    {buildMonthCalendar(attendanceMonth, attendanceDays).map((cell) => (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={!cell.date}
                        onClick={() => cell.date && void loadRouteForDate(cell.date)}
                        className={cn(
                          'rounded-lg border px-2 py-2 text-left min-h-[78px] transition-colors',
                          !cell.date && 'opacity-40 cursor-default',
                          cell.date && 'hover:bg-[var(--surface-2)]',
                          cell.date === todayDateKey && 'border-emerald-500 bg-emerald-500/10',
                          selectedDate === cell.date && 'border-brand-600 bg-brand-600/10',
                        )}
                      >
                        <p className="text-lg leading-none font-semibold">{cell.dayLabel}</p>
                        {cell.date && (
                          <p className="text-xs text-2 mt-1 num-tabular">{cell.activeMinutes}min</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {attendanceError && <p className="text-xs text-rose-600 mt-3">{attendanceError}</p>}
              </div>

              <div className="min-h-0 p-4 flex flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold tracking-tight">
                    {selectedDate ? `Route on ${selectedDate}` : 'Select a date from calendar'}
                  </p>
                  {route && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-3">
                        {displayedRoutePoints.length} pings · {route.siteVisits.length} site visits · {route.assignedProjects.length} zones
                      </span>
                    </div>
                  )}
                </div>
                <div className="relative flex-1 min-h-[380px] rounded-2xl overflow-hidden border border-[var(--border)]">
                  {route && (
                    <div className="absolute top-3 right-3 z-[1000]">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!latestRoutePing}
                          onClick={() => {
                            if (!latestRoutePing) return;
                            setSelectedCompanyProjectId(null);
                            setSelectedDistanceProjectId(null);
                            setSelectedPingId(latestRoutePing.id);
                            setSelectedPingFocusTick((tick) => tick + 1);
                          }}
                          className="relative h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] inline-flex items-center justify-center disabled:opacity-50"
                          aria-label="Focus user latest location"
                          title={
                            latestRoutePing
                              ? latestPingIsLive
                                ? 'User live: latest ping within 1 hour'
                                : 'User offline: latest ping older than 1 hour'
                              : 'No user location ping available'
                          }
                        >
                          <User className="h-4.5 w-4.5 text-[var(--text-2)]" />
                          {latestRoutePing && (
                            <span
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[var(--surface)]',
                                latestPingIsLive ? 'bg-emerald-500' : 'bg-rose-500'
                              )}
                            />
                          )}
                        </button>
                        <Button
                          type="button"
                          variant="soft"
                          size="sm"
                          disabled={!selectedPingId && !selectedDistanceProjectId && !selectedCompanyProjectId}
                          onClick={() => {
                            setSelectedPingId(null);
                            setSelectedDistanceProjectId(null);
                            setSelectedCompanyProjectId(null);
                          }}
                        >
                          Return to route
                        </Button>
                      </div>
                    </div>
                  )}
                  <MapContainer
                    center={displayedRoutePoints.length ? [displayedRoutePoints[0].lat, displayedRoutePoints[0].lng] : [20, 0]}
                    zoom={displayedRoutePoints.length ? 12 : 2}
                    minZoom={2}
                    maxZoom={18}
                    className="h-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {route && (displayedRoutePoints.length > 0 || route.assignedProjects.length > 0) && (
                      <>
                        <FocusOnSelectedPing
                          point={route.points.find((entry) => entry.id === selectedPingId) ?? null}
                          focusTick={selectedPingFocusTick}
                          disabled={Boolean((selectedDistanceProject && latestRoutePing) || selectedCompanyProject)}
                        />
                        <FocusOnDistancePair
                          project={selectedDistanceProject}
                          latestPing={latestRoutePing}
                        />
                        <FocusOnCompanyProject
                          project={selectedCompanyProject}
                          focusTick={selectedCompanyFocusTick}
                        />
                        <RouteViewport
                          points={[
                            ...displayedRoutePoints.map((point) => [point.lat, point.lng] as [number, number]),
                            ...route.assignedProjects.map((project) => [project.lat, project.lng] as [number, number]),
                          ]}
                          enabled={!selectedPingId && !selectedCompanyProject}
                        />
                        {route.assignedProjects.map((project) => (
                          <Circle
                            key={`zone-${project.projectId}`}
                            center={[project.lat, project.lng]}
                            radius={project.radiusM}
                            pathOptions={{
                              color: '#2563eb',
                              fillColor: '#2563eb',
                              fillOpacity: 0.08,
                              weight: 2,
                              dashArray: '6 6',
                            }}
                          />
                        ))}
                        {route.assignedProjects.map((project) => (
                          <CircleMarker
                            key={`project-${project.projectId}`}
                            center={[project.lat, project.lng]}
                            radius={6}
                            pathOptions={{
                              color: '#1d4ed8',
                              fillColor: '#3b82f6',
                              fillOpacity: 0.95,
                              weight: 2,
                            }}
                          >
                            <Tooltip direction="top" offset={[0, -8]} permanent>
                              {project.projectName}
                            </Tooltip>
                          </CircleMarker>
                        ))}
                        {selectedDistanceProject && latestRoutePing && (
                          <Polyline
                            positions={[
                              [selectedDistanceProject.lat, selectedDistanceProject.lng],
                              [latestRoutePing.lat, latestRoutePing.lng],
                            ]}
                            pathOptions={{
                              color: '#7c3aed',
                              weight: 3,
                              dashArray: '6 8',
                              opacity: 0.95,
                            }}
                          />
                        )}
                        {displayedRoutePoints.length > 1 && (
                          <Polyline positions={displayedRoutePoints.map((point) => [point.lat, point.lng] as [number, number])} pathOptions={{ color: '#e30613', weight: 4 }} />
                        )}
                        {displayedRoutePoints.map((point, index) => (
                          <CircleMarker
                            key={point.id}
                            center={[point.lat, point.lng]}
                            radius={point.id === selectedPingId ? 9 : index === 0 || index === displayedRoutePoints.length - 1 ? 6 : 4}
                            eventHandlers={{
                              click: () => {
                                setSelectedPingId(point.id);
                                setSelectedPingFocusTick((tick) => tick + 1);
                              },
                            }}
                            pathOptions={{
                              color: point.id === selectedPingId ? '#ca8a04' : index === 0 ? '#16a34a' : index === displayedRoutePoints.length - 1 ? '#2563eb' : '#e30613',
                              fillColor: point.id === selectedPingId ? '#facc15' : index === 0 ? '#16a34a' : index === displayedRoutePoints.length - 1 ? '#2563eb' : '#e30613',
                              fillOpacity: point.id === selectedPingId ? 1 : 0.9,
                              weight: point.id === selectedPingId ? 3 : 2,
                            }}
                          />
                        ))}
                      </>
                    )}
                  </MapContainer>
                </div>
                <div className="mt-3">
                  {routeLoading ? (
                    <p className="text-xs text-3">Loading route...</p>
                  ) : !route ? (
                    <p className="text-xs text-3">No route data for selected date.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-[var(--border)]">
                        <button
                          type="button"
                          onClick={() => setAssignedZonesOpen((value) => !value)}
                          className="w-full px-2.5 py-2 inline-flex items-center justify-between text-left hover:bg-[var(--surface-2)]"
                        >
                          <span className="text-xs font-semibold inline-flex items-center gap-1.5">
                            {assignedZonesOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            Assigned project zones (500m)
                          </span>
                          <span className="text-[11px] text-3">{route.assignedProjects.length}</span>
                        </button>
                        {assignedZonesOpen && (
                          <div className="px-2.5 pb-2.5">
                            {route.assignedProjects.length === 0 ? (
                              <p className="text-xs text-3">No assigned projects for this user.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {route.assignedProjects.map((project) => {
                                  const distanceKm = latestRoutePing
                                    ? haversineMeters(project.lat, project.lng, latestRoutePing.lat, latestRoutePing.lng) / 1000
                                    : null;
                                  const isSelectedDistance = selectedDistanceProjectId === project.projectId;
                                  return (
                                    <li key={project.projectId} className="text-xs rounded-lg border border-[var(--border)] px-2.5 py-1.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="font-medium">{project.projectName}</p>
                                          <p className="text-3">{project.radiusM}m radius highlighted on map</p>
                                          {isSelectedDistance && distanceKm != null && (
                                            <p className="text-[11px] text-violet-600 mt-0.5">
                                              {distanceKm.toFixed(2)} km to latest ping
                                            </p>
                                          )}
                                        </div>
                                        <div className="inline-flex items-center gap-1.5">
                                          <Button
                                            type="button"
                                            variant="soft"
                                            size="sm"
                                            disabled={!latestRoutePing}
                                            onClick={() => {
                                              const nextSelectedDistanceProjectId =
                                                selectedDistanceProjectId === project.projectId ? null : project.projectId;
                                              setSelectedDistanceProjectId(nextSelectedDistanceProjectId);
                                              setSelectedCompanyProjectId(null);
                                              if (latestRoutePing && nextSelectedDistanceProjectId) {
                                                setSelectedPingId(latestRoutePing.id);
                                                setSelectedPingFocusTick((tick) => tick + 1);
                                              } else {
                                                setSelectedPingId(null);
                                              }
                                            }}
                                          >
                                            Distance to {attendanceUser?.firstName ?? 'user'}
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                              const nextCompanyProjectId =
                                                selectedCompanyProjectId === project.projectId ? null : project.projectId;
                                              setSelectedCompanyProjectId(nextCompanyProjectId);
                                              setSelectedCompanyFocusTick((tick) => tick + 1);
                                              setSelectedDistanceProjectId(null);
                                              setSelectedPingId(null);
                                            }}
                                          >
                                            Go to company
                                          </Button>
                                        </div>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1.5">Detected site visits</p>
                        {route.siteVisits.length === 0 ? (
                          <p className="text-xs text-3">No site visits detected for selected date.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {route.siteVisits.map((visit) => (
                              <li key={`${visit.projectId}-${visit.visitedAt}`} className="text-xs rounded-lg border border-[var(--border)] px-2.5 py-1.5">
                                <p className="font-medium">{visit.projectName}</p>
                                <p className="text-3">{new Date(visit.visitedAt).toLocaleTimeString('en-AE')}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">Location ping timeline</p>
                          {route.points.length > filteredRoutePoints.length && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setShowAllPings((value) => !value);
                                setSelectedPingId(null);
                                setSelectedPingFocusTick((tick) => tick + 1);
                              }}
                              className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 focus:ring-rose-500/30"
                            >
                              {showAllPings ? 'Show movement only' : 'Show all'}
                            </Button>
                          )}
                        </div>
                        <p className="text-[11px] text-3 mb-1.5">
                          {showAllPings ? 'Showing all pings.' : 'Showing only movement pings (120m+ change).'}
                        </p>
                        {displayedRoutePoints.length === 0 ? (
                          <p className="text-xs text-3">No movement pings found for selected date.</p>
                        ) : (
                          <div className="max-h-52 overflow-y-auto rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
                            {displayedRoutePoints
                              .slice()
                              .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
                              .map((point, index) => (
                                <button
                                  key={point.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPingId(point.id);
                                    setSelectedPingFocusTick((tick) => tick + 1);
                                  }}
                                  className={cn(
                                    'w-full text-left px-2.5 py-2 text-xs hover:bg-[var(--surface-2)] transition-colors',
                                    point.id === selectedPingId && 'bg-amber-500/10 border-l-2 border-amber-500',
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium">
                                      Ping {index + 1} · {new Date(point.recordedAt).toLocaleTimeString('en-AE', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                      })}
                                    </p>
                                    {point.accuracyM != null && (
                                      <span className="text-3">{Math.round(point.accuracyM)}m accuracy</span>
                                    )}
                                  </div>
                                  <p className="text-3 mt-0.5 num-tabular">
                                    {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                                  </p>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
              </div>
            )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function normalizeOptionalId(value: string): string | null {
  return value.trim() ? value : null;
}

function compareUsersByHierarchy(a: UserListItem, b: UserListItem) {
  const roleDiff = ROLE_SORT_ORDER[a.role as Role] - ROLE_SORT_ORDER[b.role as Role];
  if (roleDiff !== 0) return roleDiff;

  if (a.role === 'MANAGER' && b.role === 'MANAGER') {
    const rmA = a.regionalManager ? `${a.regionalManager.lastName} ${a.regionalManager.firstName}` : '';
    const rmB = b.regionalManager ? `${b.regionalManager.lastName} ${b.regionalManager.firstName}` : '';
    const rmDiff = rmA.localeCompare(rmB);
    if (rmDiff !== 0) return rmDiff;
  }

  if (a.role === 'SALES_REP' && b.role === 'SALES_REP') {
    const reportsDiff = getReportsToLabel(a).localeCompare(getReportsToLabel(b));
    if (reportsDiff !== 0) return reportsDiff;
  }

  const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
  const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
  return nameA.localeCompare(nameB);
}

function effectiveRegionalManagerId(entry: UserListItem, allUsers: UserListItem[]): string | null {
  if (entry.regionalManagerId) return entry.regionalManagerId;
  if (entry.managerId) {
    const manager = allUsers.find((user) => user.id === entry.managerId);
    return manager?.regionalManagerId ?? null;
  }
  return null;
}

function getReportsToLabel(entry: UserListItem): string {
  if (entry.role === 'SALES_REP') {
    if (entry.manager) {
      return `${entry.manager.firstName} ${entry.manager.lastName}`.trim();
    }
    if (entry.regionalManager) {
      return `Direct → ${entry.regionalManager.firstName} ${entry.regionalManager.lastName}`.trim();
    }
    return 'Not assigned';
  }
  if (entry.role === 'MANAGER' && entry.regionalManager) {
    return `${entry.regionalManager.firstName} ${entry.regionalManager.lastName}`.trim();
  }
  if (entry.role === 'REGIONAL_MANAGER' && entry.reportsTo) {
    return `${entry.reportsTo.firstName} ${entry.reportsTo.lastName}`.trim();
  }
  return '—';
}

function roleBadgeTone(role: Role): 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' {
  switch (role) {
    case 'ADMIN':
      return 'brand';
    case 'CEO':
      return 'warning';
    case 'REGIONAL_MANAGER':
      return 'success';
    case 'MANAGER':
      return 'info';
    case 'SALES_REP':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function formatAed(value: number) {
  return new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(value);
}

function buildMonthCalendar(month: string, days: UserLocationAttendanceDay[]) {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const startWeekday = start.getDay();
  const dayCount = new Date(year, monthIndex, 0).getDate();
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const cells: Array<{ key: string; date: string | null; dayLabel: string; activeMinutes: number }> = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ key: `pad-${i}`, date: null, dayLabel: '-', activeMinutes: 0 });
  }
  for (let d = 1; d <= dayCount; d++) {
    const date = new Date(Date.UTC(year, monthIndex - 1, d)).toISOString().slice(0, 10);
    const stats = dayMap.get(date);
    cells.push({
      key: date,
      date,
      dayLabel: String(d),
      activeMinutes: stats?.activeMinutes ?? 0,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}`, date: null, dayLabel: '-', activeMinutes: 0 });
  }
  return cells;
}

function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, monthIndex - 1, 1));
  cursor.setUTCMonth(cursor.getUTCMonth() + delta);
  return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isUserLive(lastLocationPingAt: string | null, isActive: boolean) {
  if (!isActive || !lastLocationPingAt) return false;
  const lastSeenMs = new Date(lastLocationPingAt).getTime();
  if (!Number.isFinite(lastSeenMs)) return false;
  // Pings are sent every 60s; treat <=150s as live.
  return Date.now() - lastSeenMs <= 150_000;
}

function formatLastSeen(timestamp: string) {
  const ts = new Date(timestamp).getTime();
  if (!Number.isFinite(ts)) return "unknown";
  const diffMs = Math.max(0, Date.now() - ts);
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function filterMovementPoints(points: UserLocationRoute["points"], minDistanceMeters: number) {
  if (points.length === 0) return [];
  const kept: UserLocationRoute["points"] = [points[0]];
  let lastKept = points[0];
  for (let index = 1; index < points.length; index += 1) {
    const next = points[index];
    const moved = haversineMeters(lastKept.lat, lastKept.lng, next.lat, next.lng);
    if (moved >= minDistanceMeters) {
      kept.push(next);
      lastKept = next;
    }
  }
  return kept;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function RouteViewport({ points, enabled }: { points: [number, number][]; enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }
    map.fitBounds(points, { padding: [24, 24], maxZoom: 15 });
  }, [map, points, enabled]);

  return null;
}

function FocusOnSelectedPing({
  point,
  focusTick,
  disabled,
}: {
  point: UserLocationRoute['points'][number] | null;
  focusTick: number;
  disabled?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!point || disabled) return;
    const currentZoom = map.getZoom();
    const targetZoom = currentZoom < 17 ? 17 : currentZoom;
    map.flyTo([point.lat, point.lng], targetZoom, { animate: true, duration: 0.5 });
  }, [map, point, focusTick, disabled]);

  return null;
}

function FocusOnDistancePair({
  project,
  latestPing,
}: {
  project: UserLocationRoute['assignedProjects'][number] | null;
  latestPing: UserLocationRoute['points'][number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!project || !latestPing) return;
    map.fitBounds(
      [
        [project.lat, project.lng],
        [latestPing.lat, latestPing.lng],
      ],
      { padding: [48, 48], maxZoom: 16 }
    );
  }, [map, project, latestPing]);

  return null;
}

function FocusOnCompanyProject({
  project,
  focusTick,
}: {
  project: UserLocationRoute['assignedProjects'][number] | null;
  focusTick: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!project) return;
    const currentZoom = map.getZoom();
    const targetZoom = currentZoom < 16 ? 16 : currentZoom;
    map.flyTo([project.lat, project.lng], targetZoom, { animate: true, duration: 0.5 });
  }, [map, project, focusTick]);

  return null;
}
