import Link from 'next/link';
import {
  AlertOctagon,
  Bell,
  Check,
  Clock,
  Filter,
  Mail,
  Mic,
  Phone,
  Plus,
  Sparkles,
  Calendar,
  MapPin as MapPinIcon,
  MessageCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { followUps } from '@/lib/data';
import { cn, relativeTime } from '@/lib/utils';

export default function FollowUpsPage() {
  const overdue = followUps.filter((f) => f.status === 'Overdue');
  const today = followUps.filter((f) => f.status === 'Due today');
  const upcoming = followUps.filter((f) => f.status === 'Upcoming');

  return (
    <>
      <PageHeader
        eyebrow="Follow-up Engine"
        title="Stay relentless."
        subtitle={`You have ${overdue.length} overdue, ${today.length} due today and ${upcoming.length} upcoming. Update in under 15 seconds.`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />}>Filter</Button>
            <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>New follow-up</Button>
          </>
        }
      />

      <section className="px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 mb-4">
        <Bucket count={overdue.length} title="Overdue" subtitle="Action immediately" tone="danger" icon={<AlertOctagon className="h-5 w-5" />} />
        <Bucket count={today.length} title="Due today" subtitle="Before end of day" tone="warning" icon={<Clock className="h-5 w-5" />} />
        <Bucket count={upcoming.length} title="Upcoming" subtitle="Next 7 days" tone="success" icon={<Calendar className="h-5 w-5" />} />
      </section>

      <section className="px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <FollowUpList title="Overdue" items={overdue} tone="danger" />
          <FollowUpList title="Due today" items={today} tone="warning" />
          <FollowUpList title="Upcoming" items={upcoming} tone="success" />
        </div>

        <div className="space-y-4">
          {/* Quick log */}
          <Card className="p-5 bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            <Bell className="h-5 w-5 mb-3 relative" />
            <h3 className="text-base font-semibold tracking-tight relative">15-second update</h3>
            <p className="text-xs opacity-80 mt-1 relative">Voice in, AI summarizes, follow-up logged.</p>
            <Button variant="secondary" size="md" className="mt-4 w-full !bg-white !text-brand-700 !border-0 hover:!bg-white/90" icon={<Mic className="h-4 w-4" />}>
              Hold to record
            </Button>
          </Card>

          {/* AI suggestions */}
          <Card>
            <CardHeader
              title="AI suggestions"
              subtitle="Next-best action per follow-up"
              action={<Badge tone="brand"><Sparkles className="h-3 w-3" /> AI</Badge>}
            />
            <ul className="px-5 pb-5 space-y-3">
              {[
                'Send BS 8414 fire test report PDF to Eng. Saeed before 14:00',
                'Reconfirm sample arrival with Hassan Tabbara — last contact 11 days ago',
                'Move Sobha Hartland to Negotiation; quote v3 already issued',
                'Re-engage Dr. Karim Fawzy (score 48) — losing share to Alpolic',
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />
                  <span className="text-2 leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Discipline score */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">Discipline score</h3>
            <p className="text-xs text-3 mt-0.5">Avg response time and follow-through</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-bold tracking-tight font-display num-tabular">82</span>
              <span className="text-sm text-3 mb-1.5">/ 100</span>
              <Badge tone="success" className="ml-auto">+6 this week</Badge>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500" style={{ width: '82%' }} />
            </div>
            <ul className="mt-4 space-y-2 text-xs">
              {[
                ['On-time response', '94%'],
                ['Voice notes logged', '17 this wk'],
                ['Avg response time', '2h 14m'],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between border-b border-[var(--border)] py-1.5 last:border-0">
                  <span className="text-2">{k}</span>
                  <span className="font-semibold num-tabular">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </>
  );
}

function Bucket({ count, title, subtitle, tone, icon }: { count: number; title: string; subtitle: string; tone: 'danger' | 'warning' | 'success'; icon: React.ReactNode }) {
  const TONES: Record<typeof tone, string> = {
    danger: 'from-rose-500/20 to-transparent text-rose-700 dark:text-rose-300 border-rose-500/20',
    warning: 'from-amber-500/20 to-transparent text-amber-700 dark:text-amber-300 border-amber-500/20',
    success: 'from-emerald-500/20 to-transparent text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  };
  const dot: Record<typeof tone, string> = {
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
  };
  return (
    <Card className={cn('p-5 relative overflow-hidden bg-gradient-to-br', TONES[tone])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-3 font-semibold inline-flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', dot[tone])} /> {title}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight font-display num-tabular">{count}</p>
          <p className="text-[11px] text-3 mt-1">{subtitle}</p>
        </div>
        <div className="h-9 w-9 rounded-xl surface border border-[var(--border)] flex items-center justify-center">{icon}</div>
      </div>
    </Card>
  );
}

function FollowUpList({ title, items, tone }: { title: string; items: typeof followUps; tone: 'danger' | 'warning' | 'success' }) {
  if (items.length === 0) return null;
  const dot: Record<typeof tone, string> = {
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
  };
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', dot[tone])} /> {title}
            <span className="text-3 text-[11px] font-normal">({items.length})</span>
          </span>
        }
      />
      <ul className="divide-y divide-[var(--border)]">
        {items.map((f) => (
          <li key={f.id} className="px-5 py-4 hover:bg-[var(--surface-2)]/60 transition-colors">
            <div className="flex items-start gap-3">
              <Avatar name={f.contact} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold tracking-tight truncate">{f.contact}</p>
                  <span className="text-[10px] text-3">·</span>
                  <span className="text-[11px] text-2">{f.contactRole}</span>
                  <Badge tone="neutral" className="!text-[10px]">{f.channel}</Badge>
                </div>
                <Link href={`/projects/${f.projectId}`} className="text-xs text-3 hover:text-brand-600 transition-colors inline-flex items-center gap-1 mt-0.5">
                  <MapPinIcon className="h-2.5 w-2.5" /> {f.projectName}
                </Link>
                <p className="mt-2 text-sm text-2">{f.note}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-3">{relativeTime(f.dueAt)}</p>
                <div className="mt-2 flex items-center gap-1">
                  <Button variant="soft" size="sm" className="!h-7 !px-2" aria-label="Call"><Phone className="h-3 w-3" /></Button>
                  <Button variant="soft" size="sm" className="!h-7 !px-2" aria-label="WhatsApp"><MessageCircle className="h-3 w-3" /></Button>
                  <Button variant="soft" size="sm" className="!h-7 !px-2" aria-label="Email"><Mail className="h-3 w-3" /></Button>
                  <Button variant="primary" size="sm" className="!h-7 !px-2" aria-label="Done"><Check className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
