import { Building2, Filter, Heart, HardHat, Plus, Search, TrendingUp, Users2, PenTool } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { relationships } from '@/lib/data';
import { cn, formatAED } from '@/lib/utils';

export default function RelationshipsPage() {
  const groups = {
    Architect: relationships.filter((r) => r.role === 'Architect'),
    Consultant: relationships.filter((r) => r.role === 'Consultant'),
    Contractor: relationships.filter((r) => r.role === 'Contractor'),
    Fabricator: relationships.filter((r) => r.role === 'Fabricator'),
  };

  const icons = {
    Architect: PenTool,
    Consultant: Users2,
    Contractor: HardHat,
    Fabricator: Building2,
  };

  return (
    <>
      <PageHeader
        eyebrow="Specifier & Relationship Management"
        title="Your influence network."
        subtitle="Architects, consultants, contractors and fabricators — ranked by relationship strength and impact on the pipeline."
        actions={
          <>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-3" />
              <input className="pl-9 pr-3 h-9 w-64 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm placeholder:text-3" placeholder="Search by name or firm…" />
            </div>
            <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />}>Filter</Button>
            <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>Add contact</Button>
          </>
        }
      />

      {/* Summary strip */}
      <section className="px-4 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
        {(Object.keys(groups) as Array<keyof typeof groups>).map((role) => {
          const list = groups[role];
          const avg = Math.round(list.reduce((a, b) => a + b.score, 0) / list.length);
          const Icon = icons[role];
          return (
            <Card key={role} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">{role}s</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight font-display num-tabular">{list.length}</p>
                  <p className="text-[11px] text-3 mt-1 inline-flex items-center gap-1">
                    <Heart className="h-2.5 w-2.5" /> Avg score {avg}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-2">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      {/* Influence map */}
      <section className="px-4 lg:px-8 mb-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Influence hierarchy — Burj Binghatti deal</h3>
              <p className="text-xs text-3 mt-0.5">Visualized decision flow</p>
            </div>
            <Badge tone="brand">Sample project</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-stretch">
            {[
              { role: 'Developer', name: 'DAMAC', icon: Building2, weight: 100 },
              { role: 'Consultant', name: 'WSP', icon: Users2, weight: 85 },
              { role: 'Architect', name: 'Killa Design', icon: PenTool, weight: 92 },
              { role: 'Contractor', name: 'ASGC', icon: HardHat, weight: 70 },
              { role: 'Fabricator', name: 'Folcra Beach', icon: Building2, weight: 95 },
            ].map((n, i, arr) => (
              <div key={n.role} className="relative">
                <div className="card p-3 text-center">
                  <div className="h-10 w-10 mx-auto rounded-xl bg-brand-600/10 text-brand-600 flex items-center justify-center mb-2">
                    <n.icon className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">{n.role}</p>
                  <p className="text-sm font-medium mt-0.5 truncate">{n.name}</p>
                  <div className="mt-2 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className="h-full bg-brand-600" style={{ width: `${n.weight}%` }} />
                  </div>
                  <p className="text-[10px] text-3 mt-1.5">Influence {n.weight}</p>
                </div>
                {i < arr.length - 1 && (
                  <span className="hidden md:block absolute top-1/2 -right-2 -translate-y-1/2 text-3 text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Per-role tables of cards */}
      {(Object.keys(groups) as Array<keyof typeof groups>).map((role) => {
        const Icon = icons[role];
        return (
          <section key={role} className="px-4 lg:px-8 mt-2 mb-4">
            <Card>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4 text-3" /> {role}s
                  </span>
                }
                subtitle={`${groups[role].length} contacts · sorted by relationship score`}
              />
              <ul className="divide-y divide-[var(--border)]">
                {groups[role]
                  .sort((a, b) => b.score - a.score)
                  .map((r) => {
                    const tone = r.score >= 80 ? 'success' : r.score >= 60 ? 'warning' : 'danger';
                    return (
                      <li key={r.id} className="px-5 py-4 flex items-center gap-4 hover:bg-[var(--surface-2)]/60 transition-colors">
                        <Avatar name={r.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold tracking-tight truncate">{r.name}</p>
                            {r.preferredBrand === 'Alubond' && (
                              <Badge tone="brand"><Heart className="h-3 w-3" /> Prefers Alubond</Badge>
                            )}
                            {r.preferredBrand && r.preferredBrand !== 'Alubond' && (
                              <Badge tone="danger">Prefers {r.preferredBrand}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-3 truncate mt-0.5">{r.org} · {r.city}</p>
                          <p className="text-[11px] text-3 mt-1">Last touch: <span className="text-2 font-medium">{r.lastTouch}</span></p>
                        </div>

                        <div className="hidden md:flex flex-col items-end gap-1.5 w-44">
                          <div className="flex items-center gap-2 text-[11px] text-3 w-full justify-between">
                            <span>Relationship</span>
                            <span className="font-bold num-tabular text-[var(--text)]">{r.score}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                            <div className={cn('h-full', tone === 'success' ? 'bg-emerald-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${r.score}%` }} />
                          </div>
                        </div>

                        <div className="text-right shrink-0 w-32 hidden md:block">
                          <p className="text-sm font-bold num-tabular">{formatAED(r.totalWonAED, true)}</p>
                          <p className="text-[10px] text-3 inline-flex items-center gap-1 justify-end"><TrendingUp className="h-2.5 w-2.5" /> {r.openProjects} active</p>
                        </div>

                        <Button variant="secondary" size="sm">Open</Button>
                      </li>
                    );
                  })}
              </ul>
            </Card>
          </section>
        );
      })}
    </>
  );
}
