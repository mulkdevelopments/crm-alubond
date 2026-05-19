import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  ChevronRight,
  CircleCheck,
  Edit3,
  FileText,
  Flame,
  HardHat,
  Layers3,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Paperclip,
  PenTool,
  Phone,
  ScanLine,
  Send,
  Sparkles,
  TrendingUp,
  User,
  Users2,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StaticMap } from '@/components/map/StaticMap';
import { STAGE_TONES, STAGES, projects } from '@/lib/data';
import { cn, formatAED, formatNumber } from '@/lib/utils';

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = projects.find((x) => x.id === id);
  if (!p) notFound();

  const stageIdx = STAGES.indexOf(p.stage as (typeof STAGES)[number]);
  const stakeholders = [
    { role: 'Architect', name: p.architect, icon: PenTool },
    { role: 'Consultant', name: p.consultant, icon: Users2 },
    { role: 'Main Contractor', name: p.contractor, icon: HardHat },
    { role: 'Fabricator', name: p.fabricator, icon: Building2 },
    { role: 'Developer', name: p.developer, icon: Building2 },
  ];

  const timeline = [
    { when: 'Today, 11:24', who: p.owner, what: 'Site visit completed — façade engineer walkthrough', tone: 'visit' as const },
    { when: 'Today, 09:10', who: 'AI Assistant', what: 'Flagged: consultant has not been contacted in 9 days', tone: 'ai' as const },
    { when: 'Yesterday, 16:42', who: p.owner, what: 'Quotation v3 issued — margin held at 18.5%', tone: 'quote' as const },
    { when: '2 days ago', who: 'Aisha Al Mazrouei', what: 'Sample dispatched via Aramex — tracking 8842 0991 4421', tone: 'sample' as const },
    { when: '4 days ago', who: p.owner, what: 'Voice note: client prefers wood grain finish on plinth', tone: 'voice' as const },
    { when: '1 week ago', who: 'System', what: `Stage moved to ${p.stage}`, tone: 'stage' as const },
  ];

  return (
    <>
      <div className="px-4 lg:px-8 pt-6">
        <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-xs text-3 hover:text-[var(--text)] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to pipeline
        </Link>
      </div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span>{p.id}</span>
            <span className="text-3">·</span>
            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider', STAGE_TONES[p.stage])}>{p.stage}</span>
            {p.competitor && <Badge tone="warning">vs {p.competitor}</Badge>}
            {p.fireRating === 'A2' && <Badge tone="danger"><Flame className="h-3 w-3" /> A2 FR mandate</Badge>}
          </span>
        }
        title={p.name}
        subtitle={
          <span className="inline-flex items-center gap-2 flex-wrap">
            <MapPin className="h-3.5 w-3.5" /> {p.city}, {p.country}
            <span className="text-3">·</span>
            <span>{p.developer}</span>
            <span className="text-3">·</span>
            <span>Owner: {p.owner}</span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Edit3 className="h-4 w-4" />}>Edit</Button>
            <Button variant="primary" size="sm" icon={<Send className="h-4 w-4" />}>Log update</Button>
          </>
        }
      />

      {/* KPI strip */}
      <section className="px-4 lg:px-8 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Project value" value={formatAED(p.value, true)} sub={`${formatNumber(p.quantitySqm)} m²`} />
        <Stat label="Margin" value={`${p.marginPct}%`} sub="Healthy" tone="success" />
        <Stat label="Win probability" value={`${p.probability}%`} bar />
        <Stat label="Expected order" value={new Date(p.expectedOrder).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })} sub="ETA" />
        <Stat label="Days in stage" value={`${p.daysInStage}`} sub={p.daysInStage > 30 ? 'Push needed' : 'On track'} tone={p.daysInStage > 30 ? 'warning' : 'neutral'} />
      </section>

      <section className="px-4 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stage progress + timeline + AI */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold tracking-tight mb-4">Pipeline stage</h3>
            <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-2">
              {STAGES.map((s, i) => {
                const done = i < stageIdx;
                const current = i === stageIdx;
                return (
                  <div key={s} className="flex items-center gap-1 shrink-0">
                    <div className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-all',
                      done && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
                      current && 'bg-brand-600 border-brand-600 text-white shadow-brand',
                      !done && !current && 'border-[var(--border)] text-3',
                    )}>
                      {done && <CircleCheck className="h-3.5 w-3.5" />}
                      {current && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-soft" />}
                      <span>{s}</span>
                    </div>
                    {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-3" />}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* AI brief */}
          <Card className="p-5 bg-gradient-to-br from-violet-50 via-white to-rose-50 dark:from-violet-950/30 dark:via-[var(--surface)] dark:to-rose-950/20 border-violet-200/40 dark:border-violet-900/40">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-violet-700 dark:text-violet-300 font-semibold">AI Brief</p>
                <h4 className="mt-0.5 text-sm font-semibold tracking-tight">Push toward Negotiation — 3 actions recommended</h4>
                <p className="mt-2 text-sm text-2 leading-relaxed">
                  Win probability is <b>{p.probability}%</b> and the deal has been static for <b>{p.daysInStage} days</b>. Last contact with <b>{p.consultant}</b> was 9 days ago — competitors are filling the gap. Suggested next moves:
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" /> Walk through BS 8414 fire-test report with {p.consultant} this week.</li>
                  <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" /> Re-engage {p.architect} with the wood-grain plinth sample mentioned in voice note.</li>
                  <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" /> Pre-empt {p.competitor || 'competitor'} by locking fabricator slot at {p.fabricator}.</li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" icon={<MessageCircle className="h-4 w-4" />}>Draft WhatsApp</Button>
                  <Button size="sm" variant="secondary" icon={<Mail className="h-4 w-4" />}>Draft email</Button>
                  <Button size="sm" variant="ghost" icon={<Activity className="h-4 w-4" />}>Why this prediction?</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Stakeholders */}
          <Card>
            <CardHeader title="Stakeholders" subtitle="Decision influence map" action={<Button variant="ghost" size="sm">+ Add</Button>} />
            <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {stakeholders.map((s) => (
                <div key={s.role} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60">
                  <div className="h-9 w-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-2">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">{s.role}</p>
                    <p className="text-sm font-medium truncate">{s.name}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="!h-7 !px-2"><Phone className="h-3 w-3" /></Button>
                </div>
              ))}
              <div className="md:col-span-2 flex items-center gap-3 p-3 rounded-xl border border-dashed border-[var(--border-strong)]">
                <div className="h-9 w-9 rounded-xl bg-brand-600/10 text-brand-600 flex items-center justify-center"><User className="h-4 w-4" /></div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Key decision maker</p>
                  <p className="text-sm font-medium">{p.decisionMaker}</p>
                </div>
                <Badge tone="brand"><TrendingUp className="h-3 w-3" /> High influence</Badge>
              </div>
            </div>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardHeader title="Activity timeline" subtitle="Every touchpoint, captured automatically" />
            <ol className="px-5 pb-5 relative">
              <span className="absolute left-[31px] top-1 bottom-1 w-px bg-[var(--border)]" />
              {timeline.map((t, i) => {
                const tones = {
                  visit: ['bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', <Camera className="h-3.5 w-3.5" key="i" />] as const,
                  ai: ['bg-violet-500/15 text-violet-700 dark:text-violet-300', <Sparkles className="h-3.5 w-3.5" key="i" />] as const,
                  quote: ['bg-brand-600/15 text-brand-700 dark:text-brand-300', <FileText className="h-3.5 w-3.5" key="i" />] as const,
                  sample: ['bg-amber-500/15 text-amber-700 dark:text-amber-300', <Paperclip className="h-3.5 w-3.5" key="i" />] as const,
                  voice: ['bg-sky-500/15 text-sky-700 dark:text-sky-300', <Mic className="h-3.5 w-3.5" key="i" />] as const,
                  stage: ['bg-ink-200 dark:bg-ink-800 text-2', <Layers3 className="h-3.5 w-3.5" key="i" />] as const,
                };
                const [bg, icon] = tones[t.tone];
                return (
                  <li key={i} className="relative pl-12 pb-5 last:pb-0">
                    <span className={cn('absolute left-0 top-0 h-7 w-7 rounded-full flex items-center justify-center ring-4 ring-[var(--surface)]', bg)}>
                      {icon}
                    </span>
                    <p className="text-xs text-3">{t.when} · <span className="text-2 font-medium">{t.who}</span></p>
                    <p className="text-sm mt-0.5">{t.what}</p>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">Quick log</h3>
            <p className="text-xs text-3 mt-0.5 mb-4">Under 15 seconds, any device</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Mic />, label: 'Voice note' },
                { icon: <Camera />, label: 'Geo photo' },
                { icon: <Phone />, label: 'Call' },
                { icon: <MessageCircle />, label: 'WhatsApp' },
                { icon: <Mail />, label: 'Email' },
                { icon: <ScanLine />, label: 'Scan card' },
              ].map((a) => (
                <button key={a.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors">
                  <span className="h-8 w-8 rounded-lg bg-brand-600/10 text-brand-600 flex items-center justify-center">{a.icon}</span>
                  <span className="text-[10px] font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Project facts */}
          <Card>
            <CardHeader title="Project facts" />
            <dl className="px-5 pb-5 text-sm space-y-2">
              {[
                ['Product', `${p.product}`],
                ['Fire rating', `${p.fireRating}`],
                ['Spec status', p.specStatus],
                ['Quantity', `${formatNumber(p.quantitySqm)} m²`],
                ['Sample submitted', p.sampleSubmitted ? 'Yes' : 'No'],
                ['Aging', `${p.aging} days`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                  <dt className="text-2">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Map mini */}
          <Card>
            <CardHeader title="Site location" subtitle={`${p.city}, ${p.country}`} />
            <div className="px-4 pb-4">
              <StaticMap
                pins={[{ id: p.id, lat: p.lat, lng: p.lng, tone: 'brand', size: 'lg', pulse: true }]}
                height="h-[180px]"
                cities={false}
              />
              <Button variant="secondary" size="sm" className="mt-3 w-full" icon={<Calendar className="h-4 w-4" />}>
                Schedule site visit
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, sub, bar, tone }: { label: string; value: string; sub?: string; bar?: boolean; tone?: 'success' | 'warning' | 'neutral' }) {
  return (
    <Card className="p-4">
      <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight font-display num-tabular">{value}</p>
      {bar && (
        <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div className="h-full bg-brand-600" style={{ width: value.replace('%', '') + '%' }} />
        </div>
      )}
      {sub && <p className={cn('text-[11px] mt-1', tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : 'text-3')}>{sub}</p>}
    </Card>
  );
}
