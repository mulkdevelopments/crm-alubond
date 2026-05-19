import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Eye,
  Flame,
  Gauge,
  HeartHandshake,
  Sparkles,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { TrendChart } from '@/components/charts/TrendChart';
import { StaticMap, type MapPin } from '@/components/map/StaticMap';
import { ceoMetrics, monthlyTrend, projects, salesteam } from '@/lib/data';
import { cn, formatAED } from '@/lib/utils';

export default function CEOPage() {
  const competitorAreas: { city: string; brand: string; share: number; lat: number; lng: number }[] = [
    { city: 'Riyadh KAFD', brand: 'Alpolic', share: 62, lat: 24.76, lng: 46.64 },
    { city: 'Doha West Bay', brand: 'Reynobond', share: 54, lat: 25.32, lng: 51.53 },
    { city: 'Abu Dhabi Corniche', brand: 'Alucobond', share: 48, lat: 24.47, lng: 54.38 },
  ];

  const heatPins: MapPin[] = projects.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    tone: p.stage === 'Won' ? 'success' : p.stage === 'Lost' ? 'danger' : 'brand',
    size: p.value > 10_000_000 ? 'lg' : p.value > 4_000_000 ? 'md' : 'sm',
  }));

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Crown className="h-3 w-3" /> CEO Command Center
          </span>
        }
        title={<>Mission control.</>}
        subtitle="One-pane view of the things that actually move the business — pipeline health, fake forecasts, velocity, margin leakage and competitor heat."
        actions={<Badge tone="brand"><Eye className="h-3 w-3" /> Realtime · auto-refresh</Badge>}
      />

      {/* Hero metrics */}
      <section className="px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6 lg:p-8 relative overflow-hidden bg-gradient-to-br from-ink-900 via-ink-950 to-black text-white border-0 dark:from-[var(--surface)] dark:via-[var(--surface)] dark:to-[var(--surface-2)] dark:text-[var(--text)]">
          <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
            <Big label="Real pipeline" value={formatAED(ceoMetrics.realPipelineAED, true)} delta={11} />
            <Big label="Fake pipeline" value={formatAED(ceoMetrics.fakePipelineAED, true)} delta={-18} danger />
            <Big label="Velocity" value={`${ceoMetrics.velocityDays}d`} hint="avg deal cycle" delta={-7} />
            <Big label="Conversion" value={`${ceoMetrics.conversionPct}%`} delta={4} />
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden">
          <span className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500 opacity-20 blur-2xl" />
          <p className="text-[10px] uppercase tracking-widest text-3 font-semibold inline-flex items-center gap-1.5">
            <Gauge className="h-3 w-3" /> Pipeline health
          </p>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-6xl font-bold tracking-tight font-display num-tabular">{ceoMetrics.pipelineHealth}</p>
            <span className="text-sm text-3 mb-2">/ 100</span>
          </div>
          <p className="text-xs text-2 mt-1">Composite of velocity, follow-up SLA, win probability and fake-pipeline ratio.</p>
          <div className="mt-4 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 via-amber-500 to-emerald-500" style={{ width: `${ceoMetrics.pipelineHealth}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-3">
            <span>Risk</span><span>Stable</span><span>Strong</span>
          </div>
        </Card>
      </section>

      {/* Trend + Map */}
      <section className="px-4 lg:px-8 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Sales target vs achieved"
            subtitle="Last 6 months · AED in millions"
            action={<Badge tone="success"><TrendingUp className="h-3 w-3" /> +18% YoY</Badge>}
          />
          <div className="px-3 pb-3">
            <TrendChart data={monthlyTrend} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Competitor heat zones"
            subtitle="Where we're losing share"
            action={<Badge tone="danger"><Flame className="h-3 w-3" /> 3 hotspots</Badge>}
          />
          <ul className="px-5 pb-5 space-y-3">
            {competitorAreas.map((c) => (
              <li key={c.city} className="p-3 rounded-xl bg-[var(--surface-2)]/60">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold tracking-tight truncate">{c.city}</p>
                  <Badge tone="danger">{c.brand}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${c.share}%` }} />
                  </div>
                  <span className="text-xs font-bold num-tabular w-10 text-right">{c.share}%</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Market heatmap + Performers */}
      <section className="px-4 lg:px-8 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Market heatmap"
            subtitle="Project density and value across the GCC"
            action={<Badge tone="info">{projects.length} sites</Badge>}
          />
          <div className="px-4 pb-4">
            <StaticMap pins={heatPins} height="h-[380px]" />
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Top performer</p>
                <p className="text-base font-bold tracking-tight">{ceoMetrics.topPerformer}</p>
                <p className="text-[11px] text-3">112% to target · Abu Dhabi</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Needs coaching</p>
                <p className="text-base font-bold tracking-tight">{ceoMetrics.underperformer}</p>
                <p className="text-[11px] text-3">64% to target · Northern Emirates</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-brand-600 flex items-center justify-center text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Mega projects in scope</p>
                <p className="text-base font-bold tracking-tight">{ceoMetrics.megaProjects}</p>
                <p className="text-[11px] text-3">NEOM, Diriyah, Red Sea, KAFD</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Salespeople performance grid */}
      <section className="px-4 lg:px-8 mt-4">
        <Card>
          <CardHeader title="Team performance" subtitle="Achieved vs target this quarter" />
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {salesteam.map((s) => {
              const pct = Math.round((s.achievedAED / s.targetAED) * 100);
              const ok = pct >= 100;
              return (
                <div key={s.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} size="md" online={s.online} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tracking-tight truncate">{s.name}</p>
                      <p className="text-[11px] text-3 truncate">{s.region}</p>
                    </div>
                    <span className={cn('text-sm font-bold num-tabular', ok ? 'text-emerald-600' : pct >= 80 ? 'text-brand-600' : 'text-amber-600')}>{pct}%</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className={cn('h-full rounded-full', ok ? 'bg-emerald-500' : pct >= 80 ? 'bg-brand-600' : 'bg-amber-500')} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-3">
                    <div><p className="num-tabular text-sm font-bold text-[var(--text)]">{formatAED(s.achievedAED, true)}</p><p>Achieved</p></div>
                    <div><p className="num-tabular text-sm font-bold text-[var(--text)]">{formatAED(s.pipelineAED, true)}</p><p>Pipeline</p></div>
                    <div><p className="num-tabular text-sm font-bold text-[var(--text)]">{s.conversionPct}%</p><p>Conversion</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* Risk + Margin */}
      <section className="px-4 lg:px-8 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center"><AlertTriangle className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Margin leakage</p>
              <p className="text-2xl font-bold tracking-tight font-display num-tabular mt-1">{formatAED(ceoMetrics.marginLeakageAED, true)}</p>
              <p className="text-xs text-2 mt-1">Aggregate margin given away in discount approvals this quarter. 73% concentrated in Northern Emirates pipeline.</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><HeartHandshake className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Top relationship driving close</p>
              <p className="text-2xl font-bold tracking-tight font-display mt-1">Folcra Beach Industrial</p>
              <p className="text-xs text-2 mt-1">38% of won projects in the last 4 quarters involve this fabricator. Strongest predictor of close in your CRM data.</p>
            </div>
          </div>
        </Card>
      </section>
    </>
  );
}

function Big({ label, value, hint, delta, danger }: { label: string; value: string; hint?: string; delta?: number; danger?: boolean }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest opacity-60 font-semibold">{label}</p>
      <p className={cn('mt-2 text-2xl md:text-3xl font-bold tracking-tight font-display num-tabular', danger && 'text-rose-300')}>{value}</p>
      {hint && <p className="text-[11px] opacity-60 mt-0.5">{hint}</p>}
      {delta !== undefined && (
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold mt-1.5', up && !danger ? 'text-emerald-300' : danger || !up ? 'text-rose-300' : 'opacity-80')}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta)}% <span className="opacity-60 font-normal ml-0.5">QoQ</span>
        </span>
      )}
    </div>
  );
}
