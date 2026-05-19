import Link from 'next/link';
import {
  ArrowUpRight,
  Bell,
  Briefcase,
  Filter,
  Flame,
  MapPin,
  Mic,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { KpiCard } from '@/components/cards/KpiCard';
import { ProjectCard } from '@/components/cards/ProjectCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { TrendChart } from '@/components/charts/TrendChart';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { LossDonut } from '@/components/charts/LossDonut';
import { StaticMap, type MapPin as Pin } from '@/components/map/StaticMap';
import {
  activities,
  aiInsights,
  followUps,
  lossReasonBreakdown,
  monthlyTrend,
  projects,
  relationships,
  salesteam,
  stageFunnel,
} from '@/lib/data';
import { formatAED } from '@/lib/utils';

export default function DashboardPage() {
  const active = projects.filter((p) => p.stage !== 'Won' && p.stage !== 'Lost');
  const wonValue = projects.filter((p) => p.stage === 'Won').reduce((a, b) => a + b.value, 0);
  const pipelineValue = active.reduce((a, b) => a + b.value, 0);
  const forecast = active.reduce((a, b) => a + (b.value * b.probability) / 100, 0);
  const overdue = followUps.filter((f) => f.status === 'Overdue').length;

  const pins: Pin[] = projects.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    label: `${p.name} — ${formatAED(p.value, true)}`,
    tone:
      p.stage === 'Won'
        ? 'success'
        : p.stage === 'Lost'
          ? 'danger'
          : p.stage === 'Negotiation' || p.stage === 'PO Expected' || p.stage === 'Approved'
            ? 'warning'
            : 'brand',
    size: p.value > 5_000_000 ? 'lg' : p.value > 2_000_000 ? 'md' : 'sm',
    pulse: p.stage === 'Negotiation' || p.stage === 'PO Expected',
  }));

  const hotProjects = [...active].sort((a, b) => b.probability * b.value - a.probability * a.value).slice(0, 3);
  const topArchitects = relationships.filter((r) => r.role === 'Architect').sort((a, b) => b.totalWonAED - a.totalWonAED);
  const topFabricators = relationships.filter((r) => r.role === 'Fabricator').sort((a, b) => b.totalWonAED - a.totalWonAED);

  return (
    <>
      <PageHeader
        eyebrow="Sales Command Center"
        title={<>Good morning, Karim <span className="text-brand-600">.</span></>}
        subtitle="Here's your pipeline pulse for today — 17 May. Aisha is leading the GCC region, and 7 follow-ups need attention before lunch."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />}>All regions</Button>
            <Button variant="primary" size="sm" icon={<Mic className="h-4 w-4" />}>Voice log</Button>
          </>
        }
      />

      {/* KPI strip */}
      <section className="px-4 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard
          label="Pipeline value"
          value={formatAED(pipelineValue, true)}
          hint={`${active.length} active projects`}
          delta={14}
          icon={<Briefcase className="h-4 w-4" />}
          accent="brand"
          spark={[12, 18, 14, 22, 26, 24, 32]}
        />
        <KpiCard
          label="Forecast (weighted)"
          value={formatAED(forecast, true)}
          hint="Probability-weighted close this Q"
          delta={9}
          icon={<Target className="h-4 w-4" />}
          accent="success"
          spark={[8, 10, 12, 11, 14, 16, 18]}
        />
        <KpiCard
          label="MTD won"
          value={formatAED(wonValue, true)}
          hint="vs AED 12M target"
          delta={-3}
          icon={<Trophy className="h-4 w-4" />}
          accent="warning"
          spark={[14, 12, 10, 12, 11, 13, 11]}
        />
        <KpiCard
          label="Overdue follow-ups"
          value={overdue}
          hint="Across 4 salespeople"
          delta={-22}
          icon={<Bell className="h-4 w-4" />}
          accent="danger"
          spark={[9, 11, 8, 6, 8, 7, 4]}
        />
      </section>

      {/* AI Insight banner */}
      <section className="px-4 lg:px-8 mt-4">
        <Card className="p-5 lg:p-6 relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white border-0">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-20 -right-10 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-amber-400/30 blur-3xl" />
          </div>
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest opacity-80 font-semibold">AI Insight · This week</p>
                <h3 className="mt-1 text-lg lg:text-xl font-bold tracking-tight font-display leading-snug">
                  Projects above AED 2M are being lost due to delayed consultant engagement.
                </h3>
                <p className="mt-1.5 text-sm opacity-80 max-w-2xl">
                  4 of 6 deals over AED 2M lost in the last 90 days had ≥ 14 days without a consultant touchpoint. Enforce a 7-day SLA on this segment.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-bold tracking-tight">+18%</p>
                <p className="text-[10px] uppercase tracking-widest opacity-70">win-rate uplift</p>
              </div>
              <Button variant="secondary" size="md" className="!bg-white !text-brand-700 hover:!bg-white/90 !border-0">
                Investigate <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Main grid */}
      <section className="px-4 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Sales target vs achieved"
            subtitle="Last 6 months · AED in millions"
            action={
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-2"><span className="h-2 w-2 rounded-full bg-brand-600" /> Achieved</span>
                <span className="inline-flex items-center gap-1.5 text-3"><span className="h-2 w-2 rounded-full bg-ink-400" /> Target</span>
              </div>
            }
          />
          <div className="px-3 pb-3">
            <TrendChart data={monthlyTrend} />
          </div>
        </Card>

        {/* Loss analysis */}
        <Card>
          <CardHeader
            title="Loss analysis"
            subtitle="Why we lose · Last 90 days"
            action={<Badge tone="danger">Action needed</Badge>}
          />
          <div className="p-5 pt-2">
            <LossDonut data={lossReasonBreakdown} />
          </div>
        </Card>
      </section>

      {/* Pipeline funnel + Map */}
      <section className="px-4 lg:px-8 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Live project map — GCC"
            subtitle={`${projects.length} projects · ${formatAED(pipelineValue + wonValue, true)} total value`}
            action={
              <div className="flex items-center gap-2 text-[10px]">
                <span className="chip"><span className="dot bg-brand-600" /> Active</span>
                <span className="chip"><span className="dot bg-amber-500" /> Negotiation</span>
                <span className="chip"><span className="dot bg-emerald-500" /> Won</span>
                <span className="chip"><span className="dot bg-rose-500" /> Lost</span>
              </div>
            }
          />
          <div className="px-4 pb-4">
            <StaticMap pins={pins} height="h-[360px]" showLabels />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Pipeline funnel"
            subtitle="Stage distribution"
            action={
              <Link href="/pipeline" className="text-xs font-medium text-brand-600 hover:underline inline-flex items-center gap-1">
                Open kanban <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="p-5 pt-2">
            <FunnelChart data={stageFunnel} />
          </div>
        </Card>
      </section>

      {/* Hot projects + Follow-ups + Team */}
      <section className="px-4 lg:px-8 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Hot projects this week"
              subtitle="Highest probability × value"
              action={<Badge tone="brand"><Flame className="h-3 w-3" /> 3 to push</Badge>}
            />
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {hotProjects.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Live activity feed"
              subtitle="From field salespeople — auto-captured"
              action={<span className="inline-flex items-center gap-1.5 text-[10px] text-3"><span className="dot bg-emerald-500 animate-pulse-soft" /> LIVE</span>}
            />
            <ul className="px-5 pb-5 divide-y divide-[var(--border)]">
              {activities.map((a) => (
                <li key={a.id} className="py-3 flex items-start gap-3">
                  <Avatar name={a.who} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{a.who}</span>{' '}
                      <span className="text-2">{a.what}</span>
                    </p>
                    <p className="text-[11px] text-3 mt-0.5 truncate">
                      {a.project}
                      {a.geo && <> · <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5 inline" /> {a.geo}</span></>}
                    </p>
                  </div>
                  <span className="text-[10px] text-3 whitespace-nowrap shrink-0 mt-1">{a.when}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Upcoming follow-ups"
              subtitle="Next 24 hours"
              action={<Link href="/follow-ups" className="text-xs font-medium text-brand-600 hover:underline">See all</Link>}
            />
            <ul className="px-5 pb-5 space-y-3">
              {followUps.slice(0, 5).map((f) => {
                const tone = f.status === 'Overdue' ? 'danger' : f.status === 'Due today' ? 'warning' : 'success';
                return (
                  <li key={f.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] transition-colors">
                    <span className={`mt-1 dot ${tone === 'danger' ? 'bg-rose-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={tone as 'danger' | 'warning' | 'success'}>{f.status}</Badge>
                        <span className="text-[10px] text-3">{f.channel}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium leading-snug truncate">{f.contact}</p>
                      <p className="text-[11px] text-3 truncate">{f.projectName}</p>
                    </div>
                    <Button variant="soft" size="sm" className="!h-7 !px-2"><Phone className="h-3 w-3" /></Button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Field team"
              subtitle="Live presence"
              action={
                <Link href="/team" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>
              }
            />
            <ul className="px-5 pb-5 space-y-3">
              {salesteam.map((s) => {
                const pct = Math.round((s.achievedAED / s.targetAED) * 100);
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    <Avatar name={s.name} size="sm" online={s.online} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{s.name}</span>
                        <span className="text-[11px] font-semibold num-tabular">{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 80 ? 'bg-brand-600' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </section>

      {/* Specifier rankings */}
      <section className="px-4 lg:px-8 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Top architects"
            subtitle="By won project value"
            action={<Link href="/relationships" className="text-xs font-medium text-brand-600 hover:underline">All specifiers</Link>}
          />
          <ul className="px-5 pb-5 space-y-2.5">
            {topArchitects.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
                <span className="w-5 text-[11px] font-bold text-3 num-tabular text-center">{i + 1}</span>
                <Avatar name={r.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[11px] text-3 truncate">{r.org}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold num-tabular">{formatAED(r.totalWonAED, true)}</p>
                    <p className="text-[10px] text-3">{r.openProjects} open</p>
                  </div>
                  <span className={`chip !text-[10px] ${r.score >= 80 ? '!bg-emerald-500/10 !border-emerald-500/20 !text-emerald-700' : '!bg-amber-500/10 !border-amber-500/20 !text-amber-700'}`}>
                    {r.score}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Top fabricators"
            subtitle="Repeat business partners"
            action={<Badge tone="success"><TrendingUp className="h-3 w-3" /> 38% repeat</Badge>}
          />
          <ul className="px-5 pb-5 space-y-2.5">
            {topFabricators.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
                <span className="w-5 text-[11px] font-bold text-3 num-tabular text-center">{i + 1}</span>
                <Avatar name={r.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[11px] text-3 truncate">{r.org} · {r.city}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold num-tabular">{formatAED(r.totalWonAED, true)}</p>
                  <p className="text-[10px] text-3">{r.openProjects} active</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </>
  );
}
