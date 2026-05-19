'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Filter, GripVertical, MoreHorizontal, Plus, Search, Flame, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { STAGES, type Project, type Stage } from '@/lib/data';
import { projects as seed } from '@/lib/data';
import { cn, formatAED } from '@/lib/utils';

export default function PipelinePage() {
  const [items, setItems] = useState<Project[]>(seed.filter((p) => p.stage !== 'Won' && p.stage !== 'Lost'));
  const [dragging, setDragging] = useState<string | null>(null);

  function totalFor(stage: Stage) {
    return items.filter((p) => p.stage === stage).reduce((a, b) => a + b.value, 0);
  }

  function onDrop(stage: Stage) {
    if (!dragging) return;
    setItems((prev) => prev.map((p) => (p.id === dragging ? { ...p, stage } : p)));
    setDragging(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
        title="Project pipeline"
        subtitle={`${items.length} active deals · ${formatAED(items.reduce((a, b) => a + b.value, 0), true)} total · drag a card across stages`}
        actions={
          <>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-3" />
              <input className="pl-9 pr-3 h-9 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm placeholder:text-3 w-64" placeholder="Filter projects…" />
            </div>
            <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />}>Filters</Button>
            <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>Add project</Button>
          </>
        }
      />

      <div className="px-4 lg:px-8">
        <div className="overflow-x-auto -mx-4 lg:-mx-8 px-4 lg:px-8 pb-8">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const cards = items.filter((p) => p.stage === stage);
              return (
                <div
                  key={stage}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(stage)}
                  className="w-[300px] shrink-0 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] flex flex-col"
                >
                  <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', stageDot(stage))} />
                      <h3 className="text-sm font-semibold tracking-tight truncate">{stage}</h3>
                      <Badge tone="neutral" className="!text-[10px]">{cards.length}</Badge>
                    </div>
                    <button className="text-3 hover:text-[var(--text)]"><MoreHorizontal className="h-4 w-4" /></button>
                  </div>
                  <div className="px-4 pb-2 text-[11px] text-3 num-tabular">
                    {formatAED(totalFor(stage), true)}
                  </div>

                  <div className="flex-1 min-h-[200px] p-2 space-y-2">
                    {cards.map((p) => (
                      <article
                        key={p.id}
                        draggable
                        onDragStart={() => setDragging(p.id)}
                        onDragEnd={() => setDragging(null)}
                        className={cn(
                          'group surface rounded-xl border border-[var(--border)] p-3 shadow-soft transition-all cursor-grab active:cursor-grabbing',
                          dragging === p.id ? 'opacity-50' : 'hover:shadow-card hover:-translate-y-0.5',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Link href={`/projects/${p.id}`} className="block">
                              <h4 className="text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
                                {p.name}
                              </h4>
                            </Link>
                            <p className="mt-1 text-[11px] text-3 truncate">{p.city} · {p.developer}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm font-bold tracking-tight num-tabular">{formatAED(p.value, true)}</span>
                              <span className="flex items-center gap-1 text-[10px] text-3 num-tabular">
                                <Clock className="h-2.5 w-2.5" /> {p.daysInStage}d
                              </span>
                            </div>
                            <div className="mt-2 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                              <div className="h-full bg-brand-600" style={{ width: `${p.probability}%` }} />
                            </div>
                            <div className="mt-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Avatar name={p.owner} size="xs" />
                                <span className="text-[10px] text-2">{p.owner.split(' ')[0]}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {p.value > 5_000_000 && <Flame className="h-3 w-3 text-amber-500" />}
                                {p.competitor && <span className="chip !text-[9px] !px-1.5 !py-0">vs {p.competitor}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                    {cards.length === 0 && (
                      <div className="text-center py-10 text-[11px] text-3 border border-dashed border-[var(--border-strong)] rounded-xl">
                        Drop projects here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function stageDot(s: Stage) {
  return ({
    'Lead Identified': 'bg-ink-400',
    'Consultant Contacted': 'bg-sky-500',
    Specification: 'bg-violet-500',
    'Sample Submitted': 'bg-indigo-500',
    Tender: 'bg-amber-500',
    Negotiation: 'bg-orange-500',
    Approved: 'bg-teal-500',
    'PO Expected': 'bg-emerald-500',
    Won: 'bg-emerald-600',
    Lost: 'bg-rose-500',
  } as Record<Stage, string>)[s];
}
