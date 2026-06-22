'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  LocateFixed,
  MapPin,
  Navigation,
  RotateCcw,
  Timer,
  RefreshCw,
  Trophy,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthContext';
import { listProjectActivities, listProjects, type ApiProject, type ProjectActivity } from '@/lib/projects-api';
import { formatAED } from '@/lib/utils';
import { MapInteractionOverlay } from '@/components/map/MapInteractionOverlay';
import { useScrollFriendlyMap } from '@/components/map/useScrollFriendlyMap';

const STAGE_META: Record<string, { color: string; icon: LucideIcon; tone: 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'Lead Identified': { color: '#e30613', icon: CircleDot, tone: 'danger' },
  'Consultant Contacted': { color: '#0ea5e9', icon: Navigation, tone: 'info' },
  Specification: { color: '#8b5cf6', icon: CircleDot, tone: 'brand' },
  'Sample Submitted': { color: '#6366f1', icon: CircleDot, tone: 'brand' },
  Tender: { color: '#d97706', icon: Timer, tone: 'warning' },
  Negotiation: { color: '#f97316', icon: Timer, tone: 'warning' },
  Approved: { color: '#14b8a6', icon: CheckCircle2, tone: 'success' },
  'PO Expected': { color: '#84cc16', icon: CheckCircle2, tone: 'success' },
  Won: { color: '#10b981', icon: Trophy, tone: 'success' },
  Lost: { color: '#6b7280', icon: XCircle, tone: 'neutral' },
};

const STAGE_LEGEND_ORDER = [
  'Lead Identified',
  'Consultant Contacted',
  'Specification',
  'Sample Submitted',
  'Tender',
  'Negotiation',
  'Approved',
  'PO Expected',
  'Won',
  'Lost',
];

function stageLabel(stage: string) {
  if (stage === 'Tender') return 'Quotation';
  return stage;
}

export default function MapPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [latestActivityByProjectId, setLatestActivityByProjectId] = useState<Record<string, ProjectActivity | null>>({});
  const [recentActivitiesByProjectId, setRecentActivitiesByProjectId] = useState<Record<string, ProjectActivity[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);

  const validProjects = useMemo(
    () =>
      projects.filter(
        (project) => Number.isFinite(project.lat) && Number.isFinite(project.lng),
      ),
    [projects],
  );

  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of validProjects) {
      counts.set(project.stage, (counts.get(project.stage) ?? 0) + 1);
    }
    return counts;
  }, [validProjects]);

  const filteredProjects = useMemo(() => {
    if (!stageFilter) return validProjects;
    return validProjects.filter((project) => project.stage === stageFilter);
  }, [validProjects, stageFilter]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (filteredProjects.length === 0) {
      return [20, 0];
    }
    const avgLat = filteredProjects.reduce((sum, project) => sum + project.lat, 0) / filteredProjects.length;
    const avgLng = filteredProjects.reduce((sum, project) => sum + project.lng, 0) / filteredProjects.length;
    return [avgLat, avgLng];
  }, [filteredProjects]);

  const stats = useMemo(() => {
    const won = projects.filter((project) => project.stage === 'Won');
    const lost = projects.filter((project) => project.stage === 'Lost');
    const inPlay = projects.filter((project) => project.stage !== 'Won' && project.stage !== 'Lost');
    const totalValue = inPlay.reduce((sum, project) => sum + project.valueAed, 0);
    return {
      total: projects.length,
      inPlay: inPlay.length,
      won: won.length,
      lost: lost.length,
      totalValue,
    };
  }, [projects]);

  const focusedProject = useMemo(
    () => validProjects.find((project) => project.id === focusedProjectId) ?? null,
    [validProjects, focusedProjectId]
  );
  const focusedProjectUpdates = focusedProject ? (recentActivitiesByProjectId[focusedProject.id] ?? []) : [];
  const mapInteraction = useScrollFriendlyMap();

  async function loadProjects() {
    if (!token) {
      setLoading(false);
      setProjects([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects(token);
      setProjects(data);
      const activityBuckets = await Promise.all(
        data.map(async (project) => {
          try {
            const items = await listProjectActivities(token, project.id);
            if (items.length === 0) return [project.id, null] as const;
            const latest = items
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
            return [project.id, latest] as const;
          } catch {
            return [project.id, null] as const;
          }
        })
      );
      setLatestActivityByProjectId(Object.fromEntries(activityBuckets));
      const recentBuckets = await Promise.all(
        data.map(async (project) => {
          try {
            const items = await listProjectActivities(token, project.id);
            const recent = items
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 4);
            return [project.id, recent] as const;
          } catch {
            return [project.id, []] as const;
          }
        })
      );
      setRecentActivitiesByProjectId(Object.fromEntries(recentBuckets));
      setFocusedProjectId((prev) => prev ?? data[0]?.id ?? null);
    } catch {
      setError('Failed to load project map data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <>
      <PageHeader
        title="Live coverage map"
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadProjects()}
          >
            Refresh map
          </Button>
        }
      />

      <div className="px-4 lg:px-8 grid grid-cols-1 xl:grid-cols-[1fr,360px] gap-4">
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-tight">Project markers by stage</p>
                <p className="text-xs text-3 mt-0.5">Tap markers for value, stage, and quick map focus.</p>
              </div>
              <Badge tone="brand"><MapPin className="h-3 w-3" /> {stats.total}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2">
                <p className="text-[10px] text-3">In play</p>
                <p className="text-sm font-semibold num-tabular">{stats.inPlay}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2">
                <p className="text-[10px] text-3">Won</p>
                <p className="text-sm font-semibold num-tabular text-emerald-600">{stats.won}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2">
                <p className="text-[10px] text-3">Lost</p>
                <p className="text-sm font-semibold num-tabular text-rose-600">{stats.lost}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2">
                <p className="text-[10px] text-3">Pipeline value</p>
                <p className="text-sm font-semibold num-tabular">{formatAED(stats.totalValue, true)}</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="relative isolate overflow-hidden rounded-2xl border border-[var(--border)] h-[280px] sm:h-[420px] lg:h-[640px]">
              <MapContainer
                center={mapCenter}
                zoom={filteredProjects.length > 0 ? 4 : 2}
                minZoom={2}
                maxZoom={18}
                dragging={mapInteraction.interactive}
                touchZoom={mapInteraction.interactive}
                doubleClickZoom={mapInteraction.interactive}
                boxZoom={mapInteraction.interactive}
                scrollWheelZoom={false}
                className="h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapResetViewButton
                  center={mapCenter}
                  zoom={filteredProjects.length > 0 ? 4 : 2}
                  onReset={() => setFocusedProjectId(null)}
                />
                {filteredProjects.map((project) => (
                  <ProjectMarker
                    key={project.id}
                    project={project}
                    latestActivity={latestActivityByProjectId[project.id] ?? null}
                    onFocusProject={(projectId) => setFocusedProjectId(projectId)}
                  />
                ))}
              </MapContainer>
              <MapInteractionOverlay
                visible={mapInteraction.isMobile}
                active={mapInteraction.active}
                onActivate={mapInteraction.activate}
                onDeactivate={mapInteraction.deactivate}
              />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {focusedProject && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold tracking-tight">Focused project details</h3>
              <p className="text-xs text-3 mt-0.5">Shown after “Go to location”</p>
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-sm font-semibold">{focusedProject.name}</p>
                <p className="text-xs text-3 mt-0.5">{focusedProject.city}, {focusedProject.country}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge tone={stageTone(focusedProject.stage)} className="!text-[10px]">
                    {stageLabel(focusedProject.stage)}
                  </Badge>
                  <span className="text-xs font-semibold">{formatAED(focusedProject.valueAed, true)}</span>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-xs font-semibold tracking-tight">Field team</p>
                <p className="text-[11px] text-3 mt-1">
                  Manager: <span className="font-medium text-[var(--text)]">{focusedProject.managerName}</span>
                </p>
                <p className="text-[11px] text-3 mt-0.5">
                  Sales reps: <span className="font-medium text-[var(--text)]">{focusedProject.salesRepNames.join(', ') || 'Not assigned'}</span>
                </p>
              </div>
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-xs font-semibold tracking-tight">Latest updates</p>
                {focusedProjectUpdates.length === 0 ? (
                  <p className="text-[11px] text-3 mt-1">No updates yet.</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {focusedProjectUpdates.map((activity) => (
                      <div key={activity.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                        <p className="text-[11px] font-semibold">
                          {activity.type} · {activity.createdByName ?? 'System'}
                        </p>
                        <p className="text-[11px] text-3 mt-0.5 line-clamp-2">{activity.message.split('\n')[0] || 'Activity logged.'}</p>
                        <p className="text-[10px] text-3 mt-1">{new Date(activity.createdAt).toLocaleString('en-AE')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">Stage legend</h3>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-xs text-3">Tap a stage to filter map markers</p>
              <button
                type="button"
                onClick={() => setStageFilter(null)}
                className="text-[11px] font-medium text-brand-600 hover:underline"
              >
                Show all
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-1.5">
              {STAGE_LEGEND_ORDER.map((stage) => {
                const StageIcon = STAGE_META[stage]?.icon ?? CircleDot;
                const count = stageCounts.get(stage) ?? 0;
                const active = stageFilter === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setStageFilter((prev) => (prev === stage ? null : stage))}
                    className="w-full flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition-colors"
                    style={{
                      borderColor: active ? STAGE_META[stage]?.color ?? 'var(--border)' : 'var(--border)',
                      background: active ? 'color-mix(in srgb, var(--surface-2) 75%, white 25%)' : 'var(--surface-2)',
                    }}
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: STAGE_META[stage]?.color ?? '#e30613',
                          boxShadow: `0 0 10px ${STAGE_META[stage]?.color ?? '#e30613'}`,
                        }}
                      />
                      <StageIcon className="h-3.5 w-3.5 text-3" />
                      {stageLabel(stage)}
                    </span>
                    <span className="text-[11px] font-semibold num-tabular">{count}</span>
                  </button>
                );
              })}
            </div>
            {stageFilter && (
              <p className="mt-2 text-xs text-2">
                Showing only: <span className="font-medium">{stageFilter}</span>
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">Pipeline geo summary</h3>
            <p className="text-xs text-3 mt-0.5">Live from persisted project records</p>
            <dl className="mt-4 space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                <dt className="text-xs text-3">Total projects</dt>
                <dd className="text-sm font-semibold num-tabular">{stats.total}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                <dt className="text-xs text-3">In pipeline</dt>
                <dd className="text-sm font-semibold num-tabular">{stats.inPlay}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                <dt className="text-xs text-3">Won</dt>
                <dd className="text-sm font-semibold num-tabular text-emerald-600">{stats.won}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                <dt className="text-xs text-3">Lost</dt>
                <dd className="text-sm font-semibold num-tabular text-rose-600">{stats.lost}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-xs text-3">Pipeline value</dt>
                <dd className="text-sm font-semibold num-tabular">{formatAED(stats.totalValue, true)}</dd>
              </div>
            </dl>
            {error && (
              <p className="mt-3 text-xs text-rose-600 inline-flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            {loading && <p className="mt-3 text-xs text-3">Refreshing project map...</p>}
          </Card>

          <Card>
            <CardHeader title="Recent mapped projects" subtitle="Latest from backend" />
            <ul className="px-5 pb-5 space-y-2.5">
              {validProjects.length === 0 ? (
                <li className="text-sm text-3">No projects with valid coordinates yet.</li>
              ) : (
                validProjects.slice(0, 6).map((project) => (
                  <li key={project.id}>
                    <Link href={`/projects/${project.id}`} className="block p-3 rounded-xl bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                          <p className="text-[11px] text-3 truncate">{project.city}, {project.country}</p>
                          <p className="text-[10px] text-3 mt-0.5">{stageLabel(project.stage)}</p>
                        </div>
                        <span className="text-xs font-bold num-tabular shrink-0">{formatAED(project.valueAed, true)}</span>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function markerColor(stage: string) {
  return STAGE_META[stage]?.color ?? '#e30613';
}

function stageTone(stage: string): 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  return STAGE_META[stage]?.tone ?? 'neutral';
}

function ProjectMarker({
  project,
  latestActivity,
  onFocusProject,
}: {
  project: ApiProject;
  latestActivity: ProjectActivity | null;
  onFocusProject: (projectId: string) => void;
}) {
  const map = useMap();
  const StageIcon = STAGE_META[project.stage]?.icon ?? CircleDot;
  const color = markerColor(project.stage);
  const radius = project.valueAed >= 5_000_000 ? 10 : project.valueAed >= 1_000_000 ? 8 : 6;

  return (
    <>
      <CircleMarker
        center={[project.lat, project.lng]}
        radius={radius + 5}
        pathOptions={{
          color,
          fillColor: color,
          fillOpacity: 0.22,
          weight: 0,
        }}
      />
      <CircleMarker
        center={[project.lat, project.lng]}
        radius={radius}
        pathOptions={{
          color: '#ffffff',
          fillColor: color,
          fillOpacity: 0.92,
          weight: 2,
        }}
      >
        <Popup>
          <div className="min-w-[240px] space-y-2">
            <div>
              <p className="text-sm font-semibold leading-tight">{project.name}</p>
              <p className="text-xs text-2">{project.city}, {project.country}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Badge tone={stageTone(project.stage)} className="!text-[10px] !inline-flex !items-center !gap-1">
                <StageIcon className="h-3 w-3" /> {stageLabel(project.stage)}
              </Badge>
              <span className="text-xs font-semibold">{formatAED(project.valueAed, true)}</span>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Latest update</p>
              {latestActivity ? (
                <>
                  <p className="text-xs mt-1 truncate">
                    {latestActivity.type} · {(latestActivity.createdByName ?? 'System')}
                  </p>
                  <p className="text-[11px] text-3 mt-0.5 line-clamp-2">
                    {latestActivity.message.split('\n')[0] || 'Activity logged.'}
                  </p>
                  <p className="text-[10px] text-3 mt-1">{new Date(latestActivity.createdAt).toLocaleString('en-AE')}</p>
                </>
              ) : (
                <p className="text-[11px] text-3 mt-1">No updates yet.</p>
              )}
            </div>
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  map.flyTo([project.lat, project.lng], 16, { animate: true, duration: 0.8 });
                  onFocusProject(project.id);
                }}
                className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-medium bg-brand-600 text-white hover:bg-brand-700"
              >
                <LocateFixed className="h-3.5 w-3.5" /> Go to location
              </button>
              <Link href={`/projects/${project.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                Open project
              </Link>
            </div>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

function MapResetViewButton({
  center,
  zoom,
  onReset,
}: {
  center: [number, number];
  zoom: number;
  onReset?: () => void;
}) {
  const map = useMap();

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control">
        <button
          type="button"
          onClick={() => {
            map.flyTo(center, zoom, { animate: true, duration: 0.8 });
            onReset?.();
          }}
          className="h-9 px-3 m-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-soft inline-flex items-center gap-1.5 text-xs font-medium"
          aria-label="Reset map view"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Back to overview
        </button>
      </div>
    </div>
  );
}
