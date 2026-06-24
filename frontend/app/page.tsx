'use client';

import Link from 'next/link';
import { AlertTriangle, Bell, Briefcase, Phone, Target, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth/AuthContext';
import { KpiCard } from '@/components/cards/KpiCard';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { LossDonut } from '@/components/charts/LossDonut';
import { TrendChart } from '@/components/charts/TrendChart';
import { PageHeader } from '@/components/shell/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { STAGES } from '@/lib/data';
import { listFollowUps, type ApiFollowUp } from '@/lib/followups-api';
import { listUsers, type UserListItem } from '@/lib/auth-api';
import { formatAED, formatProjectValue } from '@/lib/utils';
import { listProjectActivities, listProjects, type ApiProject, type ProjectActivity } from '@/lib/projects-api';

type ActivityFeedItem = {
  id: string;
  who: string;
  what: string;
  project: string;
  whenIso: string;
};

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [followUps, setFollowUps] = useState<ApiFollowUp[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [projectItems, followUpItems] = await Promise.all([listProjects(token), listFollowUps(token)]);
        setProjects(projectItems);
        setFollowUps(followUpItems);

        try {
          setUsers(await listUsers(token));
        } catch {
          setUsers([]);
        }

        const topProjects = projectItems.slice(0, 8);
        const activityBuckets = await Promise.all(
          topProjects.map(async (project) => {
            try {
              const items = await listProjectActivities(token, project.id);
              return items.map((item) => ({ item, projectName: project.name }));
            } catch {
              return [] as Array<{ item: ProjectActivity; projectName: string }>;
            }
          })
        );

        const feed = activityBuckets
          .flat()
          .sort((a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime())
          .slice(0, 12)
          .map((entry) => ({
            id: entry.item.id,
            who: entry.item.createdByName ?? 'System',
            what: (entry.item.message.split('\n')[0] ?? entry.item.message).slice(0, 90),
            project: entry.projectName,
            whenIso: entry.item.createdAt,
          }));
        setActivityFeed(feed);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, [token]);

  const activeProjects = useMemo(() => projects.filter((p) => p.stage !== 'Won' && p.stage !== 'Lost'), [projects]);
  const wonProjects = useMemo(() => projects.filter((p) => p.stage === 'Won'), [projects]);
  const overdueFollowUps = useMemo(() => followUps.filter((f) => f.status === 'Overdue'), [followUps]);
  const hotProjects = useMemo(
    () => [...activeProjects].sort((a, b) => b.probability * b.valueAed - a.probability * a.valueAed).slice(0, 4),
    [activeProjects]
  );

  const pipelineValue = activeProjects.reduce((sum, project) => sum + project.valueAed, 0);
  const wonValue = wonProjects.reduce((sum, project) => sum + project.valueAed, 0);
  const forecast = activeProjects.reduce((sum, project) => sum + (project.valueAed * project.probability) / 100, 0);

  const monthlyTrend = useMemo(() => buildMonthlyTrend(projects, users), [projects, users]);
  const lossBreakdown = useMemo(() => buildLossBreakdown(projects), [projects]);
  const stageFunnel = useMemo(
    () =>
      STAGES.map((stage) => {
        const inStage = projects.filter((p) => p.stage === stage);
        return { stage, count: inStage.length, value: inStage.reduce((sum, p) => sum + p.valueAed, 0) };
      }),
    [projects]
  );
  const teamSummary = useMemo(() => {
    const regionalCount = users.filter((entry) => entry.role === 'REGIONAL_MANAGER').length;
    const managerCount = users.filter((entry) => entry.role === 'MANAGER').length;
    const repCount = users.filter((entry) => entry.role === 'SALES_REP').length;
    const liveReps = users.filter((entry) => entry.role === 'SALES_REP' && isLive(entry.lastLocationPingAt, entry.isActive)).length;
    const teamPipeline = projects
      .filter((project) => project.stage !== 'Won' && project.stage !== 'Lost')
      .reduce((sum, project) => sum + project.valueAed, 0);
    return { regionalCount, managerCount, repCount, liveReps, teamPipeline };
  }, [projects, users]);

  return (
    <>
      <PageHeader
        title={<>Good morning, {user?.firstName ?? 'there'} <span className="text-brand-600">.</span></>}
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

      <section className="px-4 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard label="Pipeline value" value={formatAED(pipelineValue, true)} hint={`${activeProjects.length} active`} icon={<Briefcase className="h-4 w-4" />} accent="brand" spark={monthlyTrend.map((d) => d.achieved)} />
        <KpiCard label="Forecast (weighted)" value={formatAED(forecast, true)} hint="Weighted by probability" icon={<Target className="h-4 w-4" />} accent="success" spark={monthlyTrend.map((d) => Math.max(0, d.target - 1))} />
        <KpiCard label="MTD won" value={formatAED(wonValue, true)} hint={`${wonProjects.length} won projects`} icon={<Trophy className="h-4 w-4" />} accent="warning" spark={monthlyTrend.map((d) => d.achieved)} />
        <KpiCard label="Overdue follow-ups" value={overdueFollowUps.length} hint={`${followUps.filter((f) => f.status !== 'Done').length} open`} icon={<Bell className="h-4 w-4" />} accent="danger" spark={monthlyTrend.map((d) => Math.max(0, d.target - d.achieved))} />
      </section>

      <section className="px-4 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Sales target vs achieved" subtitle="Last 6 months · AED in millions" />
          <div className="px-3 pb-3"><TrendChart data={monthlyTrend} /></div>
        </Card>
        <Card>
          <CardHeader title="Loss analysis" subtitle="Lost deal competitor split" />
          <div className="p-5 pt-2"><LossDonut data={lossBreakdown} /></div>
        </Card>
      </section>

      <section className="px-4 lg:px-8 mt-4">
        <Card>
          <CardHeader title="Pipeline funnel" subtitle="Stage distribution" action={<Link href="/pipeline" className="text-xs font-medium text-brand-600 hover:underline">Open kanban</Link>} />
          <div className="p-5 pt-2"><FunnelChart data={stageFunnel} /></div>
        </Card>
      </section>

      <section className="px-4 lg:px-8 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Hot projects this week" subtitle="Highest probability × value" action={<Badge tone="brand">{hotProjects.length} to push</Badge>} />
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {hotProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--surface-2)] transition-colors">
                  <p className="text-sm font-semibold line-clamp-1">{project.name}</p>
                  <p className="text-[11px] text-3">{project.city}, {project.country} · {project.stage}</p>
                  <p className="text-[11px] text-3">{formatProjectValue(project, user?.role, true)} · {project.probability}% win</p>
                </Link>
              ))}
              {!loading && hotProjects.length === 0 && <p className="text-xs text-3">No active projects available.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent activity feed" subtitle="Latest project timeline updates" />
            <ul className="px-5 pb-5 divide-y divide-[var(--border)]">
              {activityFeed.map((activity) => (
                <li key={activity.id} className="py-3 flex items-start gap-3">
                  <Avatar name={activity.who} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm"><span className="font-semibold">{activity.who}</span> <span className="text-2">{activity.what}</span></p>
                    <p className="text-[11px] text-3 mt-0.5 truncate">{activity.project}</p>
                  </div>
                  <span className="text-[10px] text-3 whitespace-nowrap shrink-0 mt-1">{relativeTimeFromIso(activity.whenIso)}</span>
                </li>
              ))}
              {!loading && activityFeed.length === 0 && <li className="py-3 text-xs text-3">No activity recorded yet.</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming follow-ups" subtitle="Live reminders" action={<Link href="/follow-ups" className="text-xs font-medium text-brand-600 hover:underline">See all</Link>} />
            <ul className="px-5 pb-5 space-y-3">
              {followUps.slice(0, 5).map((f) => {
                const tone = f.status === 'Overdue' ? 'danger' : f.status === 'Due today' ? 'warning' : 'success';
                return (
                  <li key={f.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] transition-colors">
                    <span className={`mt-1 dot ${tone === 'danger' ? 'bg-rose-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><Badge tone={tone as 'danger' | 'warning' | 'success'}>{f.status}</Badge><span className="text-[10px] text-3">{f.channel}</span></div>
                      <p className="mt-1 text-sm font-medium leading-snug truncate">{f.contact}</p>
                      <p className="text-[11px] text-3 truncate">{f.projectName}</p>
                    </div>
                    <Button variant="soft" size="sm" className="!h-7 !px-2"><Phone className="h-3 w-3" /></Button>
                  </li>
                );
              })}
              {!loading && followUps.length === 0 && <li className="text-xs text-3">No follow-ups found.</li>}
            </ul>
          </Card>
        </div>
      </section>

      <section className="px-4 lg:px-8 mt-4">
        <Card>
          <CardHeader
            title="Team performance"
            subtitle="Open the dedicated full-page view for regional, manager, and sales-rep insights."
            action={<Link href="/team" className="text-xs font-medium text-brand-600 hover:underline">Open full page</Link>}
          />
          <div className="px-4 pb-4 grid grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="rounded-lg bg-[var(--surface-2)]/60 p-3">
              <p className="text-[10px] text-3 uppercase tracking-widest">Regional managers</p>
              <p className="text-xl font-bold">{teamSummary.regionalCount}</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)]/60 p-3">
              <p className="text-[10px] text-3 uppercase tracking-widest">Managers</p>
              <p className="text-xl font-bold">{teamSummary.managerCount}</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)]/60 p-3">
              <p className="text-[10px] text-3 uppercase tracking-widest">Sales reps</p>
              <p className="text-xl font-bold">{teamSummary.repCount}</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)]/60 p-3">
              <p className="text-[10px] text-3 uppercase tracking-widest">Live reps</p>
              <p className="text-xl font-bold">{teamSummary.liveReps}</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)]/60 p-3 col-span-2 lg:col-span-1">
              <p className="text-[10px] text-3 uppercase tracking-widest">Team pipeline</p>
              <p className="text-base font-bold">{formatAED(teamSummary.teamPipeline, true)}</p>
            </div>
          </div>
        </Card>
      </section>
    </>
  );
}


function buildMonthlyTrend(projects: ApiProject[], users: UserListItem[]) {
  const now = new Date();
  const labels = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    return { key, month: d.toLocaleString('en', { month: 'short' }) };
  });
  const fallbackTargetM =
    users
      .filter((u) => u.role === 'SALES_REP')
      .reduce((sum, u) => sum + ((u.yearlyTarget ?? 0) / 12), 0) / 1_000_000;

  return labels.map((entry) => {
    const achievedM =
      projects
        .filter((project) => {
          if (project.stage !== 'Won') return false;
          const date = new Date(project.updatedAt);
          const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
          return key === entry.key;
        })
        .reduce((sum, project) => sum + project.valueAed, 0) / 1_000_000;
    return {
      month: entry.month,
      target: Number((fallbackTargetM > 0 ? fallbackTargetM : Math.max(1, achievedM * 1.1)).toFixed(1)),
      achieved: Number(achievedM.toFixed(1)),
    };
  });
}

function buildLossBreakdown(projects: ApiProject[]) {
  const lost = projects.filter((project) => project.stage === 'Lost');
  if (!lost.length) return [{ reason: 'No losses', value: 100 }];
  const buckets = new Map<string, number>();
  for (const project of lost) {
    const reason = project.competitor ? `vs ${project.competitor}` : 'No competitor captured';
    buckets.set(reason, (buckets.get(reason) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([reason, count]) => ({ reason, value: Math.round((count / lost.length) * 100) }))
    .sort((a, b) => b.value - a.value);
}

function relativeTimeFromIso(iso: string) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'Unknown';
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString('en-AE', { month: 'short', day: '2-digit' });
}

function isLive(lastLocationPingAt: string | null, isActive: boolean) {
  if (!isActive || !lastLocationPingAt) return false;
  const ts = new Date(lastLocationPingAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= 150_000;
}

