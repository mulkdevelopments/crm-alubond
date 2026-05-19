import Link from 'next/link';
import { MapPin, Layers3, Building2, Flame } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { STAGE_TONES, type Project } from '@/lib/data';
import { cn, formatAED, formatNumber } from '@/lib/utils';

export function ProjectCard({ p, compact }: { p: Project; compact?: boolean }) {
  return (
    <Link href={`/projects/${p.id}`} className="block">
      <Card interactive className="p-4 group">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-semibold tracking-wider uppercase', STAGE_TONES[p.stage])}>
                {p.stage}
              </span>
              {p.competitor && (
                <Badge tone="warning">vs {p.competitor}</Badge>
              )}
            </div>
            <h4 className="mt-2 font-semibold text-sm tracking-tight leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
              {p.name}
            </h4>
            <p className="mt-1 text-xs text-3 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> {p.city}, {p.country}
              <span className="text-3">·</span>
              <span>{p.developer}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-bold tracking-tight font-display num-tabular">{formatAED(p.value, true)}</p>
            <p className="text-[10px] text-3 num-tabular">{formatNumber(p.quantitySqm)} m²</p>
          </div>
        </div>

        {!compact && (
          <>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Badge tone="neutral" className="!text-[10px]"><Layers3 className="h-2.5 w-2.5" /> {p.product}</Badge>
              {p.fireRating === 'A2' && (
                <Badge tone="danger" className="!text-[10px]"><Flame className="h-2.5 w-2.5" /> A2 FR</Badge>
              )}
              <Badge tone="neutral" className="!text-[10px]"><Building2 className="h-2.5 w-2.5" /> {p.contractor}</Badge>
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={p.owner} size="xs" />
                <span className="text-[11px] text-2 truncate">{p.owner}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-3">Win</span>
                  <span className="text-xs font-bold num-tabular">{p.probability}%</span>
                </div>
                <div className="h-1.5 w-12 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${p.probability}%` }} />
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </Link>
  );
}
