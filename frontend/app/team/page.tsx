'use client';

import { AlertTriangle, ChevronLeft, ChevronRight, UserRoundX } from 'lucide-react';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';

import { useAuth } from '@/components/auth/AuthContext';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card } from '@/components/ui/Card';
import { listUsers } from '@/lib/auth-api';
import { listActivities, listProjects, type ApiProject } from '@/lib/projects-api';
import {
  buildHierarchy,
  buildRegionHierarchy,
  nameInitials,
  type FlatActivity,
  type ManagerCard,
  type RegionalCard,
  type SalesRepCard,
} from '@/lib/team-performance';
import { formatAED, formatProjectValue } from '@/lib/utils';

type GroupMode = 'manager' | 'region';

function wonProjectsOf(projects: ApiProject[]) {
  return projects.filter((project) => project.stage === 'Won');
}

function wonAed(projects: ApiProject[]) {
  return wonProjectsOf(projects).reduce((sum, project) => sum + project.valueAed, 0);
}

function peopleCount(card: RegionalCard) {
  return (
    card.managers.length +
    card.directReps.length +
    card.managers.reduce((sum, manager) => sum + manager.reps.length, 0)
  );
}

/** Self bucket for a regional/region card: RM-credited + orphan deals (no manager/rep). */
function selfProjects(card: RegionalCard) {
  return card.unassignedProjects;
}

/** Won on named people under this node — managers (incl. their self) + direct reps. */
function peopleWonAed(card: RegionalCard) {
  const underManagers = card.managers.reduce((sum, manager) => sum + manager.metrics.achievedAed, 0);
  const direct = card.directReps.reduce((sum, rep) => sum + rep.metrics.achievedAed, 0);
  return underManagers + direct;
}

function managerSelfProjects(manager: ManagerCard) {
  return manager.unassignedProjects;
}

function managerPeopleWonAed(manager: ManagerCard) {
  return manager.reps.reduce((sum, rep) => sum + rep.metrics.achievedAed, 0);
}

export default function TeamPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof listUsers>>>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [activities, setActivities] = useState<FlatActivity[]>([]);
  const [groupMode, setGroupMode] = useState<GroupMode>('manager');
  const [selectedRegionalId, setSelectedRegionalId] = useState<string | null>(null);
  const [visitPopup, setVisitPopup] = useState<{ ownerName: string; visits: FlatActivity[] } | null>(null);
  const [pipelinePopup, setPipelinePopup] = useState<{
    ownerName: string;
    projects: ApiProject[];
    kind: 'pipeline' | 'won';
  } | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [usersData, projectsData, activityItems] = await Promise.all([
          listUsers(token),
          listProjects(token),
          listActivities(token, { type: 'visit' }),
        ]);
        setUsers(usersData);
        setProjects(projectsData);
        setActivities(
          activityItems.map(
            (item): FlatActivity => ({
              id: item.id,
              projectId: item.projectId,
              type: item.type,
              message: item.message,
              visitWhatHappened: item.visitWhatHappened,
              createdById: item.createdById,
              createdByName: item.createdByName,
              createdAt: item.createdAt,
            }),
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load team performance');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  const hierarchy = useMemo(
    () =>
      groupMode === 'region'
        ? buildRegionHierarchy(users, projects, activities)
        : buildHierarchy(users, projects, activities),
    [users, projects, activities, groupMode],
  );
  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) {
      map.set(project.id, project.name);
    }
    return map;
  }, [projects]);
  const selectedRegional = useMemo(
    () => hierarchy.find((regional) => regional.id === selectedRegionalId) ?? null,
    [hierarchy, selectedRegionalId],
  );
  const bestPerformerId = useMemo(() => {
    const sorted = [...hierarchy].sort((a, b) => b.metrics.attainmentPct - a.metrics.attainmentPct);
    return sorted[0]?.id ?? null;
  }, [hierarchy]);

  function setMode(next: GroupMode) {
    setGroupMode(next);
    setSelectedRegionalId(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Field Team"
        title={groupMode === 'region' ? 'Performance by region' : 'Performance by regional manager'}
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-3">
            <button
              type="button"
              onClick={() => setSelectedRegionalId(null)}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                selectedRegional
                  ? 'hover:bg-[var(--surface-2)] text-2'
                  : 'font-medium text-1'
              }`}
            >
              {selectedRegional ? <ChevronLeft className="h-3.5 w-3.5" /> : null}
              {groupMode === 'region' ? 'All regions' : 'All regional managers'}
            </button>
            {selectedRegional ? (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-3" />
                <span className="font-medium text-1 px-1">{selectedRegional.name}</span>
              </>
            ) : null}
          </nav>

          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            <button
              type="button"
              onClick={() => setMode('manager')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                groupMode === 'manager' ? 'bg-[var(--surface)] text-1 shadow-sm' : 'text-3 hover:text-2'
              }`}
            >
              By manager
            </button>
            <button
              type="button"
              onClick={() => setMode('region')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                groupMode === 'region' ? 'bg-[var(--surface)] text-1 shadow-sm' : 'text-3 hover:text-2'
              }`}
            >
              By region
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-3">Loading team performance...</p>}

        {!loading && hierarchy.length === 0 && (
          <Card className="p-4">
            <p className="text-sm text-3">No hierarchy data available for your role scope.</p>
          </Card>
        )}

        {!loading && !selectedRegional && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {hierarchy.map((card) => {
              const teamWon = peopleWonAed(card);
              const selfWon = wonAed(selfProjects(card));
              return (
                <OverviewCard
                  key={card.id}
                  card={card}
                  people={peopleCount(card)}
                  teamWon={teamWon}
                  selfWon={selfWon}
                  topPerformer={card.id === bestPerformerId}
                  isYou={user?.id === card.id}
                  onOpen={() => setSelectedRegionalId(card.id)}
                  onWonClick={() =>
                    setPipelinePopup({
                      ownerName: card.name,
                      projects: wonProjectsOf(card.scopedProjects),
                      kind: 'won',
                    })
                  }
                  onPipelineClick={() =>
                    setPipelinePopup({
                      ownerName: card.name,
                      projects: card.pipelineProjects,
                      kind: 'pipeline',
                    })
                  }
                />
              );
            })}
          </div>
        )}

        {!loading && selectedRegional && (
          <DrillDown
            card={selectedRegional}
            currentUserId={user?.id}
            viewerRole={user?.role}
            onWonClick={(ownerName, projects) =>
              setPipelinePopup({ ownerName, projects, kind: 'won' })
            }
            onPipelineClick={(ownerName, projects) =>
              setPipelinePopup({ ownerName, projects, kind: 'pipeline' })
            }
            onVisitsClick={(ownerName, visits) => setVisitPopup({ ownerName, visits })}
          />
        )}
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

      {pipelinePopup && (
        <div className="fixed inset-0 z-[90] bg-black/55 px-4 py-8 overflow-y-auto" onClick={() => setPipelinePopup(null)}>
          <div
            className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  {pipelinePopup.ownerName} · {pipelinePopup.kind === 'won' ? 'Won projects' : 'Pipeline details'}
                </h3>
                <p className="text-xs text-3 mt-0.5">
                  {pipelinePopup.projects.length}{' '}
                  {pipelinePopup.kind === 'won' ? 'won' : 'active'} project(s) ·{' '}
                  {formatAED(pipelinePopup.projects.reduce((sum, project) => sum + project.valueAed, 0), true)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPipelinePopup(null)}
                className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs"
              >
                Close
              </button>
            </div>

            {pipelinePopup.projects.length === 0 ? (
              <p className="text-sm text-3 mt-4">
                {pipelinePopup.kind === 'won' ? 'No won projects.' : 'No active pipeline projects.'}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {pipelinePopup.kind === 'pipeline' && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="text-xs font-semibold tracking-tight">By stage</p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Array.from(
                        pipelinePopup.projects.reduce((acc, project) => {
                          const current = acc.get(project.stage) ?? { count: 0, value: 0 };
                          current.count += 1;
                          current.value += project.valueAed;
                          acc.set(project.stage, current);
                          return acc;
                        }, new Map<string, { count: number; value: number }>()),
                      )
                        .sort((a, b) => b[1].value - a[1].value)
                        .map(([stage, stats]) => (
                          <div key={stage} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                            <p className="text-xs font-semibold">{stage}</p>
                            <p className="text-[11px] text-3 mt-0.5">
                              {stats.count} project(s) · {formatAED(stats.value, true)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {[...pipelinePopup.projects]
                    .sort((a, b) => b.valueAed - a.valueAed)
                    .map((project) => (
                      <article key={project.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{project.name}</p>
                            <p className="text-xs text-3">
                              {project.stage} · {project.city}, {project.country}
                              {project.managerName ? ` · Mgr: ${project.managerName}` : ''}
                              {project.salesRepNames?.length
                                ? ` · Reps: ${project.salesRepNames.join(', ')}`
                                : ' · No sales rep'}
                            </p>
                          </div>
                          <p className="text-xs font-semibold">{formatProjectValue(project, user?.role, true)}</p>
                        </div>
                      </article>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function OverviewCard({
  card,
  people,
  teamWon,
  selfWon,
  topPerformer,
  isYou,
  onOpen,
  onWonClick,
  onPipelineClick,
}: {
  card: RegionalCard;
  people: number;
  teamWon: number;
  selfWon: number;
  topPerformer: boolean;
  isYou: boolean;
  onOpen: () => void;
  onWonClick: () => void;
  onPipelineClick: () => void;
}) {
  const pct = card.metrics.attainmentPct;
  const bar =
    pct >= 100 ? 'bg-emerald-400' : pct >= 75 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <article
      onClick={onOpen}
      className="rounded-2xl border border-white/10 bg-[#0C1017] text-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)] cursor-pointer hover:border-white/20 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="relative h-9 w-9 shrink-0">
            <div className="h-9 w-9 rounded-full bg-[#121A26] border border-white/10 text-[11px] font-semibold inline-flex items-center justify-center text-[#8FB5FF]">
              {nameInitials(card.name)}
            </div>
            {card.online !== undefined && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0C1017] ${
                  card.online ? 'bg-emerald-400' : 'bg-white/30'
                }`}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{card.name}</p>
            {card.presenceLabel ? (
              <p className={`text-[11px] truncate ${card.online ? 'text-emerald-300' : 'text-white/55'}`}>
                {card.presenceLabel}
              </p>
            ) : null}
            <p className="text-[11px] text-white/60 truncate">{card.location || 'Not set'}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5">
          {isYou && (
            <span className="text-[10px] text-orange-300 border border-orange-500/40 bg-orange-500/10 rounded-full px-2 py-0.5">
              You
            </span>
          )}
          {topPerformer && (
            <span className="text-[10px] text-emerald-300 border border-emerald-500/40 bg-emerald-500/10 rounded-full px-2 py-0.5">
              Top
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/45">Total won</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onWonClick();
            }}
            className="text-xl font-semibold num-tabular hover:text-emerald-300 underline-offset-2 hover:underline"
          >
            {formatAED(card.metrics.achievedAed, true)}
          </button>
        </div>
        <p className="text-[11px] text-white/50 text-right">{people} people</p>
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/45 num-tabular">
        <span>{pct}% of target</span>
        <span>{formatAED(card.metrics.targetAed, true)}</span>
      </div>

      {(teamWon > 0 || selfWon > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-white/5 px-2.5 py-2">
            <p className="text-white/45">Self</p>
            <p className="mt-0.5 font-semibold num-tabular">{formatAED(selfWon, true)}</p>
          </div>
          <div className="rounded-lg bg-white/5 px-2.5 py-2">
            <p className="text-white/45">From people</p>
            <p className="mt-0.5 font-semibold num-tabular">{formatAED(teamWon, true)}</p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-white/55">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPipelineClick();
          }}
          className="hover:text-white"
        >
          Pipeline {formatAED(card.metrics.pipelineAed, true)}
        </button>
        <span className="inline-flex items-center gap-1 text-white/70">
          Open team <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );
}

function DrillDown({
  card,
  currentUserId,
  viewerRole,
  onWonClick,
  onPipelineClick,
  onVisitsClick,
}: {
  card: RegionalCard;
  currentUserId?: string;
  viewerRole?: string;
  onWonClick: (ownerName: string, projects: ApiProject[]) => void;
  onPipelineClick: (ownerName: string, projects: ApiProject[]) => void;
  onVisitsClick: (ownerName: string, visits: FlatActivity[]) => void;
}) {
  const teamWon = peopleWonAed(card);
  const selfWonProjects = wonProjectsOf(selfProjects(card));
  const selfWon = wonAed(selfWonProjects);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{card.name}</p>
            <p className="text-xs text-3 mt-0.5">{card.location}</p>
            {card.presenceLabel ? (
              <p className={`text-xs mt-1 ${card.online ? 'text-emerald-600' : 'text-3'}`}>{card.presenceLabel}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
            <SummaryStat
              label="Total won"
              value={formatAED(card.metrics.achievedAed, true)}
              onClick={() => onWonClick(card.name, wonProjectsOf(card.scopedProjects))}
            />
            <SummaryStat
              label="Self"
              value={formatAED(selfWon, true)}
              onClick={
                selfWonProjects.length > 0
                  ? () => onWonClick(`${card.name} · Self`, selfWonProjects)
                  : undefined
              }
            />
            <SummaryStat label="From people" value={formatAED(teamWon, true)} />
            <SummaryStat
              label="Pipeline"
              value={formatAED(card.metrics.pipelineAed, true)}
              onClick={() => onPipelineClick(card.name, card.pipelineProjects)}
            />
          </div>
        </div>
      </Card>

      {selfWonProjects.length > 0 && (
        <SelfOwnedSection
          ownerName={card.name}
          projects={selfWonProjects}
          viewerRole={viewerRole}
          onOpenWon={() => onWonClick(`${card.name} · Self`, selfWonProjects)}
        />
      )}

      {card.managers.length > 0 && (
        <section className="space-y-2">
          <SectionTitle title="Managers" count={card.managers.length} />
          {card.managers.map((manager) => (
            <ManagerBlock
              key={manager.id}
              manager={manager}
              currentUserId={currentUserId}
              viewerRole={viewerRole}
              onWonClick={onWonClick}
              onPipelineClick={onPipelineClick}
              onVisitsClick={onVisitsClick}
            />
          ))}
        </section>
      )}

      {card.directReps.length > 0 && (
        <section className="space-y-2">
          <SectionTitle title="Direct sales reps" count={card.directReps.length} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {card.directReps.map((rep) => (
              <PersonCard
                key={rep.id}
                name={rep.name}
                location={rep.location}
                role="Sales rep"
                metrics={rep.metrics}
                online={rep.online}
                presenceLabel={rep.presenceLabel}
                isYou={currentUserId === rep.id}
                onWonClick={() => onWonClick(rep.name, wonProjectsOf(rep.scopedProjects))}
                onPipelineClick={() => onPipelineClick(rep.name, rep.pipelineProjects)}
                onVisitsClick={() => onVisitsClick(rep.name, rep.visits)}
              />
            ))}
          </div>
        </section>
      )}

      {card.managers.length === 0 && card.directReps.length === 0 && selfWonProjects.length === 0 && (
        <Card className="p-4">
          <p className="text-sm text-3">No people or projects under this node yet.</p>
        </Card>
      )}
    </div>
  );
}

function ManagerBlock({
  manager,
  currentUserId,
  viewerRole,
  onWonClick,
  onPipelineClick,
  onVisitsClick,
}: {
  manager: ManagerCard;
  currentUserId?: string;
  viewerRole?: string;
  onWonClick: (ownerName: string, projects: ApiProject[]) => void;
  onPipelineClick: (ownerName: string, projects: ApiProject[]) => void;
  onVisitsClick: (ownerName: string, visits: FlatActivity[]) => void;
}) {
  const selfWonProjects = wonProjectsOf(managerSelfProjects(manager));
  const selfWon = wonAed(selfWonProjects);
  const fromPeople = managerPeopleWonAed(manager);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            {manager.name}
            {currentUserId === manager.id ? (
              <span className="ml-2 text-[10px] font-medium text-orange-600 dark:text-orange-300">You</span>
            ) : null}
          </p>
          <p className="text-xs text-3 mt-0.5">{manager.location || 'Manager'}</p>
          {manager.presenceLabel ? (
            <p className={`text-xs mt-0.5 ${manager.online ? 'text-emerald-600' : 'text-3'}`}>
              {manager.presenceLabel}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
          <SummaryStat
            label="Total won"
            value={formatAED(manager.metrics.achievedAed, true)}
            onClick={() => onWonClick(manager.name, wonProjectsOf(manager.scopedProjects))}
          />
          <SummaryStat
            label="Self"
            value={formatAED(selfWon, true)}
            onClick={
              selfWonProjects.length > 0
                ? () => onWonClick(`${manager.name} · Self`, selfWonProjects)
                : undefined
            }
          />
          <SummaryStat label="From people" value={formatAED(fromPeople, true)} />
          <SummaryStat
            label="Pipeline"
            value={formatAED(manager.metrics.pipelineAed, true)}
            onClick={() => onPipelineClick(manager.name, manager.pipelineProjects)}
          />
        </div>
      </div>

      {selfWonProjects.length > 0 && (
        <SelfOwnedSection
          ownerName={manager.name}
          projects={selfWonProjects}
          viewerRole={viewerRole}
          compact
          onOpenWon={() => onWonClick(`${manager.name} · Self`, selfWonProjects)}
        />
      )}

      {manager.reps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pl-1 md:pl-3">
          {manager.reps.map((rep: SalesRepCard) => (
            <PersonCard
              key={rep.id}
              name={rep.name}
              location={rep.location}
              role="Sales rep"
              metrics={rep.metrics}
              online={rep.online}
              presenceLabel={rep.presenceLabel}
              isYou={currentUserId === rep.id}
              compact
              onWonClick={() => onWonClick(rep.name, wonProjectsOf(rep.scopedProjects))}
              onPipelineClick={() => onPipelineClick(rep.name, rep.pipelineProjects)}
              onVisitsClick={() => onVisitsClick(rep.name, rep.visits)}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-3 pl-1">No sales reps under this manager.</p>
      )}
    </div>
  );
}

function SelfOwnedSection({
  ownerName,
  projects,
  viewerRole,
  onOpenWon,
  compact,
}: {
  ownerName: string;
  projects: ApiProject[];
  viewerRole?: string;
  onOpenWon: () => void;
  compact?: boolean;
}) {
  const won = wonProjectsOf(projects);
  if (won.length === 0) return null;

  return (
    <section
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="h-9 w-9 rounded-full bg-[var(--surface)] border border-[var(--border)] inline-flex items-center justify-center text-2">
            <UserRoundX className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{ownerName} · Self</p>
            <p className="text-xs text-3 mt-0.5">
              {won.length} won project{won.length === 1 ? '' : 's'} credited to this person.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenWon}
          className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs font-medium"
        >
          Won {formatAED(wonAed(won), true)}
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {[...won]
          .sort((a, b) => b.valueAed - a.valueAed)
          .map((project) => (
            <div
              key={project.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{project.name}</p>
                <p className="text-xs text-3">
                  {project.city}, {project.country}
                  {project.convertedByName ? ` · Converted by: ${project.convertedByName}` : ''}
                </p>
              </div>
              <p className="text-xs font-semibold shrink-0">{formatProjectValue(project, viewerRole, true)}</p>
            </div>
          ))}
      </div>
    </section>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <span className="text-[11px] text-3 rounded-full border border-[var(--border)] px-2 py-0.5">{count}</span>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  warn,
  onClick,
}: {
  label: string;
  value: string;
  warn?: boolean;
  onClick?: () => void;
}) {
  const className = `rounded-xl border px-3 py-2 text-left ${
    warn
      ? 'border-amber-500/40 bg-amber-500/10'
      : 'border-[var(--border)] bg-[var(--surface-2)]'
  } ${onClick ? 'hover:border-[var(--border-strong,var(--border))] cursor-pointer' : ''}`;

  const body = (
    <>
      <p className={`text-[10px] uppercase tracking-widest ${warn ? 'text-amber-700 dark:text-amber-300' : 'text-3'}`}>
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold num-tabular ${warn ? 'text-amber-800 dark:text-amber-200' : ''}`}>
        {value}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

function PersonCard({
  name,
  location,
  role,
  metrics,
  online,
  presenceLabel,
  isYou = false,
  note,
  compact = false,
  onWonClick,
  onPipelineClick,
  onVisitsClick,
}: {
  name: string;
  location: string;
  role: string;
  metrics: RegionalCard['metrics'];
  online?: boolean;
  presenceLabel?: string;
  isYou?: boolean;
  note?: string;
  compact?: boolean;
  onWonClick?: () => void;
  onPipelineClick?: () => void;
  onVisitsClick?: () => void;
}) {
  const target = metrics.assignedTargetAed ?? metrics.targetAed;
  const pct =
    metrics.assignedTargetAed != null ? metrics.assignedAttainmentPct : metrics.attainmentPct;
  const bar = pct >= 100 ? 'bg-emerald-400' : pct >= 75 ? 'bg-amber-400' : 'bg-rose-500';

  const handleWon = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onWonClick?.();
  };
  const handlePipeline = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onPipelineClick?.();
  };
  const handleVisits = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onVisitsClick?.();
  };

  return (
    <article
      className={`rounded-2xl border border-white/10 bg-[#0C1017] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="relative h-9 w-9 shrink-0">
            <div className="h-9 w-9 rounded-full bg-[#121A26] border border-white/10 text-[11px] font-semibold inline-flex items-center justify-center text-[#8FB5FF]">
              {nameInitials(name)}
            </div>
            {online !== undefined && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0C1017] ${
                  online ? 'bg-emerald-400' : 'bg-white/30'
                }`}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <span className="shrink-0 text-[10px] text-white/55 border border-white/15 rounded-full px-1.5 py-0.5">
                {role}
              </span>
              {isYou && (
                <span className="shrink-0 text-[10px] text-orange-300 border border-orange-500/40 bg-orange-500/10 rounded-full px-1.5 py-0.5">
                  You
                </span>
              )}
            </div>
            {presenceLabel ? (
              <p className={`text-[11px] truncate ${online ? 'text-emerald-300' : 'text-white/55'}`}>
                {presenceLabel}
              </p>
            ) : null}
            <p className="text-[11px] text-white/60 truncate">{location || 'Not set'}</p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/50">
          <span>Won</span>
          <button
            type="button"
            onClick={handleWon}
            className="text-sm font-semibold text-white hover:text-emerald-300 underline-offset-2 hover:underline"
          >
            {formatAED(metrics.achievedAed, true)}
          </button>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/45 num-tabular">
          <span>{pct}% of yearly target</span>
          <span>{formatAED(target, true)}</span>
        </div>
      </div>

      {note ? <p className="mt-2 text-[11px] text-amber-200/90">{note}</p> : null}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <StatButton label="Pipeline" value={formatAED(metrics.pipelineAed, true)} onClick={handlePipeline} />
        <StatButton label="Visits/wk" value={metrics.visitsWeek} onClick={handleVisits} />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/45">Convert</p>
          <p className="mt-1 text-sm font-semibold num-tabular">{metrics.conversionPct}%</p>
        </div>
      </div>
    </article>
  );
}

function StatButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string | number;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-1 py-1.5 hover:bg-white/10 transition-colors"
    >
      <p className="text-[10px] uppercase tracking-widest text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold num-tabular">{value}</p>
    </button>
  );
}
