import Link from 'next/link';
import {
  Building2,
  Camera,
  Filter,
  HardHat,
  Layers,
  MapPin,
  Mic,
  Navigation,
  PenLine,
  Radio,
  Route,
  Users2,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StaticMap, type MapPin as Pin } from '@/components/map/StaticMap';
import { projects, relationships, salesteam } from '@/lib/data';
import { cn, formatAED } from '@/lib/utils';

export default function MapPage() {
  const projectPins: Pin[] = projects.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    label: p.name,
    tone:
      p.stage === 'Won'
        ? 'success'
        : p.stage === 'Lost'
          ? 'danger'
          : p.stage === 'Negotiation' || p.stage === 'PO Expected'
            ? 'warning'
            : 'brand',
    size: p.value > 5_000_000 ? 'lg' : 'md',
  }));

  const teamPins: Pin[] = salesteam.map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    label: s.name,
    tone: 'info',
    size: 'md',
    pulse: s.online,
  }));

  const relPins: Pin[] = relationships.slice(0, 6).map((r, i) => ({
    id: r.id,
    lat: 23 + (i % 4) * 1.2 + 0.5,
    lng: 46 + (i % 5) * 2.5,
    label: r.name,
    tone: 'warning',
    size: 'sm',
  }));

  const allPins = [...projectPins, ...teamPins, ...relPins];

  return (
    <>
      <PageHeader
        eyebrow="Geo Intelligence"
        title="Live coverage map"
        subtitle="Live salesperson positions, project sites, architects and fabricators across the GCC region."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Layers className="h-4 w-4" />}>Layers</Button>
            <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />}>Filter</Button>
            <Button variant="primary" size="sm" icon={<Navigation className="h-4 w-4" />}>Plan route</Button>
          </>
        }
      />

      <div className="px-4 lg:px-8 grid grid-cols-1 xl:grid-cols-[1fr,360px] gap-4">
        <Card className="overflow-hidden">
          <div className="p-4 flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge tone="brand"><MapPin className="h-3 w-3" /> {projects.length} sites</Badge>
              <Badge tone="info"><Users2 className="h-3 w-3" /> {salesteam.filter((s) => s.online).length}/{salesteam.length} online</Badge>
              <Badge tone="warning"><HardHat className="h-3 w-3" /> 8 fabricators</Badge>
              <Badge tone="success"><Building2 className="h-3 w-3" /> 12 architects</Badge>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-3">
              <span className="chip"><span className="dot bg-brand-600" /> Active</span>
              <span className="chip"><span className="dot bg-amber-500" /> Negotiation</span>
              <span className="chip"><span className="dot bg-emerald-500" /> Won</span>
              <span className="chip"><span className="dot bg-rose-500" /> Lost</span>
              <span className="chip"><span className="dot bg-sky-500" /> Sales rep</span>
            </div>
          </div>
          <div className="p-4">
            <StaticMap pins={allPins} height="h-[640px]" showLabels />
          </div>
        </Card>

        <div className="space-y-4">
          {/* Live salespeople */}
          <Card>
            <CardHeader
              title="Live field team"
              subtitle="Auto check-in via GPS"
              action={<span className="inline-flex items-center gap-1.5 text-[10px] text-3"><Radio className="h-3 w-3 text-emerald-500 animate-pulse-soft" /> LIVE</span>}
            />
            <ul className="px-5 pb-5 space-y-3">
              {salesteam.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
                  <Avatar name={s.name} size="sm" online={s.online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-[11px] text-3 truncate inline-flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {s.region}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold num-tabular">{s.visitsThisWeek}</p>
                    <p className="text-[10px] text-3">visits/wk</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Quick mobile actions */}
          <Card>
            <CardHeader title="Field actions" subtitle="One-tap from mobile" />
            <div className="px-5 pb-5 grid grid-cols-2 gap-2">
              {[
                { icon: <Route className="h-4 w-4" />, label: 'Check-in' },
                { icon: <Camera className="h-4 w-4" />, label: 'Geo photo' },
                { icon: <Mic className="h-4 w-4" />, label: 'Voice log' },
                { icon: <PenLine className="h-4 w-4" />, label: 'Quick note' },
              ].map((a) => (
                <button
                  key={a.label}
                  className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors"
                >
                  <span className="h-9 w-9 rounded-xl bg-brand-600/10 text-brand-600 flex items-center justify-center">{a.icon}</span>
                  <span className="text-[11px] font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Territory coverage */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">Coverage gaps</h3>
            <p className="text-xs text-3 mt-0.5">Cities with low visit frequency</p>
            <ul className="mt-4 space-y-3">
              {[
                { name: 'Al Khobar, KSA', visits: 0, target: 6, severity: 'danger' as const },
                { name: 'Sohar, Oman', visits: 2, target: 8, severity: 'warning' as const },
                { name: 'Fujairah, UAE', visits: 4, target: 8, severity: 'warning' as const },
                { name: 'AlUla, KSA', visits: 1, target: 4, severity: 'danger' as const },
              ].map((c) => {
                const pct = (c.visits / c.target) * 100;
                return (
                  <li key={c.name}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium">{c.name}</span>
                      <span className="num-tabular text-3">{c.visits}/{c.target} this month</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div className={cn('h-full rounded-full', c.severity === 'danger' ? 'bg-rose-500' : 'bg-amber-500')} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Nearby projects */}
          <Card>
            <CardHeader title="Nearby right now" subtitle="2 km radius from Karim" />
            <ul className="px-5 pb-5 space-y-2.5">
              {projects.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="block p-3 rounded-xl bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-[11px] text-3 truncate">{p.city} · {p.product}</p>
                      </div>
                      <span className="text-xs font-bold num-tabular shrink-0">{formatAED(p.value, true)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
