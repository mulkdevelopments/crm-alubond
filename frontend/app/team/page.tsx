'use client';

import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';

import { useAuth } from '@/components/auth/AuthContext';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card } from '@/components/ui/Card';
import { listUsers, type UserListItem } from '@/lib/auth-api';
import { listProjectActivities, listProjects, type ApiProject, type ProjectActivity } from '@/lib/projects-api';
import { formatAED } from '@/lib/utils';

type NodeMetrics = {
  targetAed: number;
  achievedAed: number;
  pipelineAed: number;
  conversionPct: number;
  attainmentPct: number;
  visitsWeek: number;
  visitsTotal: number;
  totalProjects: number;
};

type SalesRepCard = {
  id: string;
  name: string;
  location: string;
  online: boolean;
  metrics: NodeMetrics;
  visits: FlatActivity[];
};

type ManagerCard = {
  id: string;
  name: string;
  location: string;
  reps: SalesRepCard[];
  metrics: NodeMetrics;
  visits: FlatActivity[];
};

type RegionalCard = {
  id: string;
  name: string;
  location: string;
  managers: ManagerCard[];
  metrics: NodeMetrics;
  visits: FlatActivity[];
};

type FlatActivity = {
  id: string;
  projectId: string;
  type: ProjectActivity['type'];
  message: string;
  visitWhatHappened: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
};

export default function TeamPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [activities, setActivities] = useState<FlatActivity[]>([]);
  const [selectedRegionalId, setSelectedRegionalId] = useState<string | null>(null);
  const [visitPopup, setVisitPopup] = useState<{ ownerName: string; visits: FlatActivity[] } | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [usersData, projectsData] = await Promise.all([listUsers(token), listProjects(token)]);
        const activityBuckets = await Promise.all(
          projectsData.map(async (project) => {
            try {
              const items = await listProjectActivities(token, project.id);
              return items.map(
                (item): FlatActivity => ({
                  id: item.id,
                  projectId: item.projectId,
                  type: item.type,
                  message: item.message,
                  visitWhatHappened: item.visitWhatHappened,
                  createdById: item.createdById,
                  createdByName: item.createdByName,
                  createdAt: item.createdAt,
                })
              );
            } catch {
              return [] as FlatActivity[];
            }
          })
        );
        setUsers(usersData);
        setProjects(projectsData);
        setActivities(activityBuckets.flat());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load team performance');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  const hierarchy = useMemo(() => buildHierarchy(users, projects, activities), [users, projects, activities]);
  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) {
      map.set(project.id, project.name);
    }
    return map;
  }, [projects]);
  const selectedRegional = useMemo(
    () => hierarchy.find((regional) => regional.id === selectedRegionalId) ?? null,
    [hierarchy, selectedRegionalId]
  );
  const view = selectedRegional ? 'regional-focus' : 'regionals';
  const cards = view === 'regionals' ? hierarchy : selectedRegional ? [selectedRegional] : [];
  const bestPerformerId = useMemo(() => {
    const sorted = [...cards].sort((a, b) => b.metrics.attainmentPct - a.metrics.attainmentPct);
    return sorted[0]?.id ?? null;
  }, [cards]);

  return (
    <>
      <PageHeader
        eyebrow="Team Performance"
        title="Regional → manager → sales cards"
        subtitle="Target, pipeline, visits and conversion in a focused drill-down view."
      />

      {error && (
        <section className="px-4 lg:px-8">
          <Card className="p-4 border-rose-500/30">
            <p className="text-sm text-rose-600 inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {error}
            </p>
          </Card>
        </section>
      )}

      <section className="px-4 lg:px-8 pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (view === 'regional-focus') {
                setSelectedRegionalId(null);
              }
            }}
            disabled={view === 'regionals'}
            className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs inline-flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <span className="text-xs text-2">
            {view === 'regionals'
              ? 'All regional managers'
              : `${selectedRegional?.name ?? 'Regional'} · full hierarchy`}
          </span>
        </div>

        {loading && <p className="text-sm text-3">Loading team performance...</p>}

        {!loading && cards.length === 0 && (
          <Card className="p-4">
            <p className="text-sm text-3">No hierarchy data available for your role scope.</p>
          </Card>
        )}

        {view === 'regionals' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {!loading &&
              cards.map((card) => (
                <PerformanceCard
                  key={card.id}
                  name={card.name}
                  location={(card as RegionalCard).location}
                  metrics={card.metrics}
                  topPerformer={card.id === bestPerformerId}
                  onVisitsClick={() => setVisitPopup({ ownerName: card.name, visits: (card as RegionalCard).visits })}
                  onClick={() => {
                    setSelectedRegionalId(card.id);
                  }}
                />
              ))}
          </div>
        ) : selectedRegional ? (
          <div className="space-y-3">
            <PerformanceCard
              name={selectedRegional.name}
              location={selectedRegional.location}
              metrics={selectedRegional.metrics}
              topPerformer={selectedRegional.id === bestPerformerId}
              onVisitsClick={() => setVisitPopup({ ownerName: selectedRegional.name, visits: selectedRegional.visits })}
            />

            <div className="space-y-3 border-l border-dashed border-[var(--border)] pl-4 ml-2">
              {selectedRegional.managers.map((manager) => (
                <div key={`manager-node-${manager.id}`} className="space-y-2">
                  <div className="inline-flex items-center gap-1 text-[11px] text-3">
                    <ChevronRight className="h-3.5 w-3.5" /> Manager
                  </div>
                  <PerformanceCard
                    name={manager.name}
                    location={manager.location}
                    metrics={manager.metrics}
                    topPerformer={false}
                    onVisitsClick={() => setVisitPopup({ ownerName: manager.name, visits: manager.visits })}
                  />
                  <div className="space-y-2 border-l border-dashed border-[var(--border)] pl-4 ml-2">
                    {manager.reps.length === 0 ? (
                      <p className="text-xs text-3">No sales reps assigned.</p>
                    ) : (
                      manager.reps.map((rep) => (
                        <div key={`rep-node-${rep.id}`} className="space-y-1.5">
                          <div className="inline-flex items-center gap-1 text-[11px] text-3">
                            <ChevronRight className="h-3.5 w-3.5" /> Sales rep
                          </div>
                          <PerformanceCard
                            name={rep.name}
                            location={rep.location}
                            metrics={rep.metrics}
                            topPerformer={false}
                            online={rep.online}
                            onVisitsClick={() => setVisitPopup({ ownerName: rep.name, visits: rep.visits })}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {visitPopup && (
        <div className="fixed inset-0 z-[90] bg-black/55 px-4 py-8 overflow-y-auto" onClick={() => setVisitPopup(null)}>
          <div
            className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{visitPopup.ownerName} · Visit details</h3>
                <p className="text-xs text-3 mt-0.5">{visitPopup.visits.length} total visit record(s)</p>
              </div>
              <button
                type="button"
                onClick={() => setVisitPopup(null)}
                className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs"
              >
                Close
              </button>
            </div>

            {visitPopup.visits.length === 0 ? (
              <p className="text-sm text-3 mt-4">No visits recorded.</p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {[...visitPopup.visits]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((visit) => (
                    <article key={visit.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{projectNameById.get(visit.projectId) ?? 'Project'}</p>
                        <span className="text-[11px] text-3">{new Date(visit.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-3 mt-1">By: {visit.createdByName ?? 'Unknown user'}</p>
                      <p className="text-sm mt-2 whitespace-pre-wrap break-words">
                        {visit.visitWhatHappened?.trim() || visit.message?.trim() || 'No visit note provided.'}
                      </p>
                    </article>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PerformanceCard({
  name,
  location,
  metrics,
  topPerformer,
  online,
  onClick,
  onVisitsClick,
}: {
  name: string;
  location: string;
  metrics: NodeMetrics;
  topPerformer: boolean;
  online?: boolean;
  onClick?: () => void;
  onVisitsClick?: () => void;
}) {
  const accent = metrics.attainmentPct >= 100 ? 'bg-emerald-400' : metrics.attainmentPct >= 75 ? 'bg-amber-400' : 'bg-rose-500';
  const handleVisitsClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onVisitsClick?.();
  };
  return (
    <article
      onClick={onClick}
      className={`rounded-2xl border border-white/10 bg-[#0C1017] text-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${
        onClick ? 'cursor-pointer hover:border-white/20 transition-all' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-full bg-[#121A26] border border-white/10 text-[11px] font-semibold inline-flex items-center justify-center shrink-0 text-[#8FB5FF]">
            {nameInitials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-[11px] text-white/60 truncate inline-flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${online === false ? 'bg-white/30' : 'bg-emerald-400'}`} />
              {location || 'Not set'}
            </p>
          </div>
        </div>
        {topPerformer && <span className="text-[10px] text-emerald-300 border border-emerald-500/40 bg-emerald-500/10 rounded-full px-2 py-0.5">Top performer</span>}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/50">
          <span>Target attainment</span>
          <span className="text-sm font-semibold text-white">{metrics.attainmentPct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full ${accent}`} style={{ width: `${Math.min(100, Math.max(2, metrics.attainmentPct))}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/45 num-tabular">
          <span>{formatAED(metrics.achievedAed, true)}</span>
          <span>{formatAED(metrics.targetAed, true)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Pipeline" value={formatAED(metrics.pipelineAed, true)} />
        <Stat label="Visits/wk" value={metrics.visitsWeek} onClick={handleVisitsClick} />
        <Stat label="Convert" value={`${metrics.conversionPct}%`} />
      </div>
    </article>
  );
}

function Stat({ label, value, onClick }: { label: string; value: string | number; onClick?: (event: MouseEvent<HTMLButtonElement>) => void }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg px-1 py-1.5 hover:bg-white/10 transition-colors"
        title="View visit details"
      >
        <p className="text-[10px] uppercase tracking-widest text-white/45">{label}</p>
        <p className="mt-1 text-sm font-semibold num-tabular">{value}</p>
      </button>
    );
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold num-tabular">{value}</p>
    </div>
  );
}

function buildHierarchy(users: UserListItem[], projects: ApiProject[], activities: FlatActivity[]): RegionalCard[] {
  const regionals = users.filter((user) => user.role === 'REGIONAL_MANAGER');
  const managers = users.filter((user) => user.role === 'MANAGER');
  const reps = users.filter((user) => user.role === 'SALES_REP');

  const managersByRegional = new Map<string, UserListItem[]>();
  for (const manager of managers) {
    if (!manager.regionalManagerId) continue;
    const list = managersByRegional.get(manager.regionalManagerId) ?? [];
    list.push(manager);
    managersByRegional.set(manager.regionalManagerId, list);
  }

  const repsByManager = new Map<string, UserListItem[]>();
  for (const rep of reps) {
    if (!rep.managerId) continue;
    const list = repsByManager.get(rep.managerId) ?? [];
    list.push(rep);
    repsByManager.set(rep.managerId, list);
  }

  return regionals.map((regional) => {
    const managerUsers = managersByRegional.get(regional.id) ?? [];
    const managerCards = managerUsers.map((manager) => {
      const managerProjectIds = projects.filter((project) => project.managerId === manager.id).map((project) => project.id);
      const managerProjects = projects.filter((project) => managerProjectIds.includes(project.id));
      const managerVisits = activities.filter((activity) => activity.type === 'visit' && managerProjectIds.includes(activity.projectId));
      const repCards = (repsByManager.get(manager.id) ?? []).map((rep) => {
        const repProjectIds = projects.filter((project) => project.salesRepIds.includes(rep.id)).map((project) => project.id);
        const repProjects = projects.filter((project) => repProjectIds.includes(project.id));
        const repVisits = activities.filter(
          (activity) => activity.type === 'visit' && activity.createdById === rep.id && repProjectIds.includes(activity.projectId)
        );
        return {
          id: rep.id,
          name: `${rep.firstName} ${rep.lastName}`.trim(),
          location: rep.operationLocation,
          online: isLive(rep.lastLocationPingAt, rep.isActive),
          metrics: computeMetrics(repProjects, rep.monthlyTarget, repVisits),
          visits: repVisits,
        };
      });
      const targetFromReps = repCards.reduce((sum, rep) => sum + rep.metrics.targetAed, 0);
      return {
        id: manager.id,
        name: `${manager.firstName} ${manager.lastName}`.trim(),
        location: manager.operationLocation,
        reps: repCards,
        metrics: computeMetrics(managerProjects, targetFromReps || manager.monthlyTarget, managerVisits),
        visits: managerVisits,
      };
    });

    const managerIds = new Set(managerCards.map((manager) => manager.id));
    const regionalProjects = projects.filter((project) => managerIds.has(project.managerId));
    const regionalProjectIds = new Set(regionalProjects.map((project) => project.id));
    const regionalVisits = activities.filter((activity) => activity.type === 'visit' && regionalProjectIds.has(activity.projectId));
    const targetFromManagers = managerCards.reduce((sum, manager) => sum + manager.metrics.targetAed, 0);
    return {
      id: regional.id,
      name: `${regional.firstName} ${regional.lastName}`.trim(),
      location: regional.regions.join(', ') || regional.operationLocation || 'Regional coverage',
      managers: managerCards,
      metrics: computeMetrics(regionalProjects, targetFromManagers || regional.monthlyTarget, regionalVisits),
      visits: regionalVisits,
    };
  });
}

function computeMetrics(projects: ApiProject[], targetInput: number | null | undefined, visits: FlatActivity[]): NodeMetrics {
  const wonProjects = projects.filter((project) => project.stage === 'Won');
  const activeProjects = projects.filter((project) => project.stage !== 'Won' && project.stage !== 'Lost');
  const achievedAed = wonProjects.reduce((sum, project) => sum + project.valueAed, 0);
  const pipelineAed = activeProjects.reduce((sum, project) => sum + project.valueAed, 0);
  const targetAed =
    targetInput && targetInput > 0
      ? targetInput
      : Math.max(1_000_000, Math.round((achievedAed + pipelineAed) * 0.55));
  const attainmentPct = Math.round((achievedAed / targetAed) * 100);
  const conversionPct = projects.length ? Math.round((wonProjects.length / projects.length) * 100) : 0;
  const weekStartMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const visitsWeek = visits.filter((visit) => {
    const ts = new Date(visit.createdAt).getTime();
    return Number.isFinite(ts) && ts >= weekStartMs;
  }).length;

  return {
    targetAed,
    achievedAed,
    pipelineAed,
    conversionPct,
    attainmentPct: Number.isFinite(attainmentPct) ? attainmentPct : 0,
    visitsWeek,
    visitsTotal: visits.length,
    totalProjects: projects.length,
  };
}

function nameInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function isLive(lastLocationPingAt: string | null, isActive: boolean) {
  if (!isActive || !lastLocationPingAt) return false;
  const ts = new Date(lastLocationPingAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= 150_000;
}
