import { Award, Calendar, MapPin, Route, Target, TrendingUp, Users } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StaticMap, type MapPin as Pin } from '@/components/map/StaticMap';
import { salesteam } from '@/lib/data';
import { cn, formatAED } from '@/lib/utils';

export default function TeamPage() {
  const pins: Pin[] = salesteam.map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    label: `${s.name} — ${s.region}`,
    tone: 'info',
    size: 'md',
    pulse: s.online,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Field Team"
        title="Your salesforce, live."
        subtitle="Real-time GPS, visit frequency, conversion and quota attainment."
        actions={<Badge tone="info"><Users className="h-3 w-3" /> {salesteam.filter((s) => s.online).length}/{salesteam.length} active</Badge>}
      />

      <div className="px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader title="Live team locations" subtitle="Auto check-in via mobile GPS" />
          <div className="px-4 pb-4"><StaticMap pins={pins} height="h-[400px]" showLabels /></div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-tight">This week</h3>
          <ul className="mt-4 space-y-3">
            {[
              { label: 'Visits logged', value: salesteam.reduce((a, s) => a + s.visitsThisWeek, 0), icon: <Route className="h-4 w-4" /> },
              { label: 'New meetings', value: 24, icon: <Calendar className="h-4 w-4" /> },
              { label: 'Avg conversion', value: `${Math.round(salesteam.reduce((a, s) => a + s.conversionPct, 0) / salesteam.length)}%`, icon: <TrendingUp className="h-4 w-4" /> },
              { label: 'On-target reps', value: `${salesteam.filter((s) => s.achievedAED >= s.targetAED * 0.9).length}/${salesteam.length}`, icon: <Target className="h-4 w-4" /> },
            ].map((s) => (
              <li key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60">
                <span className="h-9 w-9 rounded-xl bg-brand-600/10 text-brand-600 flex items-center justify-center">{s.icon}</span>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">{s.label}</p>
                  <p className="text-lg font-bold tracking-tight num-tabular">{s.value}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="px-4 lg:px-8 mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {salesteam.map((s) => {
          const pct = Math.round((s.achievedAED / s.targetAED) * 100);
          const ok = pct >= 100;
          const ribbon = ok ? 'Top performer' : pct >= 80 ? 'On track' : 'Needs push';
          return (
            <Card key={s.id} className="p-5 relative">
              {ok && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Award className="h-3 w-3" /> {ribbon}
                </span>
              )}
              <div className="flex items-center gap-3">
                <Avatar name={s.name} size="lg" online={s.online} />
                <div className="min-w-0">
                  <p className="text-base font-bold tracking-tight truncate">{s.name}</p>
                  <p className="text-xs text-3 truncate inline-flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {s.region}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-3 font-semibold">Target attainment</span>
                  <span className={cn('text-lg font-bold tracking-tight num-tabular', ok ? 'text-emerald-600' : pct >= 80 ? 'text-brand-600' : 'text-amber-600')}>{pct}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className={cn('h-full', ok ? 'bg-emerald-500' : pct >= 80 ? 'bg-brand-600' : 'bg-amber-500')} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-3 num-tabular">
                  <span>{formatAED(s.achievedAED, true)}</span>
                  <span>{formatAED(s.targetAED, true)}</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Pipeline', formatAED(s.pipelineAED, true)],
                  ['Visits/wk', `${s.visitsThisWeek}`],
                  ['Convert', `${s.conversionPct}%`],
                ].map(([k, v]) => (
                  <div key={k} className="p-2 rounded-xl bg-[var(--surface-2)]/60">
                    <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">{k}</p>
                    <p className="text-xs font-bold mt-1 num-tabular">{v}</p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </section>
    </>
  );
}
