'use client';

import Link from 'next/link';
import {
  AlertOctagon,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  Calendar,
  MapPin as MapPinIcon,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { cn, relativeTime } from '@/lib/utils';
import { ApiFollowUp, listFollowUps, updateFollowUp } from '@/lib/followups-api';

export default function FollowUpsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ApiFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const followUpsData = await listFollowUps(token);
      setItems(followUpsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const grouped = useMemo(() => {
    const active = items.filter((item) => item.status !== 'Done');
    const done = items.filter((item) => item.status === 'Done');
    return {
      overdue: active.filter((item) => deriveStatus(item) === 'Overdue'),
      today: active.filter((item) => deriveStatus(item) === 'Due today'),
      upcoming: active.filter((item) => deriveStatus(item) === 'Upcoming'),
      done,
    };
  }, [items]);

  const insights = useMemo(() => {
    const active = items.filter((item) => item.status !== 'Done');
    const done = items.filter((item) => item.status === 'Done');
    const total = items.length;
    const completionRate = total === 0 ? 0 : Math.round((done.length / total) * 100);

    const channelOrder: ApiFollowUp['channel'][] = ['Call', 'Visit', 'WhatsApp', 'Email', 'Meeting'];
    const channelMap = new Map<ApiFollowUp['channel'], number>(channelOrder.map((entry) => [entry, 0]));
    for (const item of active) {
      channelMap.set(item.channel, (channelMap.get(item.channel) ?? 0) + 1);
    }
    const channels = channelOrder.map((entry) => ({ channel: entry, count: channelMap.get(entry) ?? 0 }));

    const ownerMap = new Map<string, number>();
    for (const item of active) {
      const owner = item.ownerName?.trim() || 'Unassigned';
      ownerMap.set(owner, (ownerMap.get(owner) ?? 0) + 1);
    }
    const owners = Array.from(ownerMap.entries())
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const nextDue = [...active]
      .filter((item) => Number.isFinite(new Date(item.dueAt).getTime()))
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0] ?? null;

    return {
      total,
      activeCount: active.length,
      doneCount: done.length,
      completionRate,
      channels,
      owners,
      nextDue,
    };
  }, [items]);

  async function markDone(followUpId: string) {
    if (!token) return;
    try {
      await updateFollowUp(token, followUpId, { status: 'Done' });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update follow-up');
    }
  }

  async function recoverFollowUp(followUpId: string, dueAt: string) {
    if (!token) return;
    try {
      await updateFollowUp(token, followUpId, { status: computeStatusFromDueDate(dueAt) });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to recover follow-up');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Follow-up Engine"
        title="Stay relentless."
        subtitle={`You have ${grouped.overdue.length} overdue, ${grouped.today.length} due today, ${grouped.upcoming.length} upcoming and ${grouped.done.length} done.`}
      />

      <section className="px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 mb-4">
        <Bucket count={grouped.overdue.length} title="Overdue" subtitle="Action immediately" tone="danger" icon={<AlertOctagon className="h-5 w-5" />} />
        <Bucket count={grouped.today.length} title="Due today" subtitle="Before end of day" tone="warning" icon={<Clock className="h-5 w-5" />} />
        <Bucket count={grouped.upcoming.length} title="Upcoming" subtitle="Next 7 days" tone="success" icon={<Calendar className="h-5 w-5" />} />
      </section>

      <section className="px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <Card className="p-5"><p className="text-sm text-3">Loading follow-ups...</p></Card>
          ) : (
            <>
              <FollowUpList title="Overdue" items={grouped.overdue} tone="danger" onDone={markDone} />
              <FollowUpList title="Due today" items={grouped.today} tone="warning" onDone={markDone} />
              <FollowUpList title="Upcoming" items={grouped.upcoming} tone="success" onDone={markDone} />
              <FollowUpList title="Done" items={grouped.done} tone="success" doneMode onRecover={recoverFollowUp} />
            </>
          )}
          {error && <p className="text-sm text-rose-600 px-1">{error}</p>}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Live summary" subtitle="Real-time follow-up workload" />
            <div className="px-5 pb-5">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-[var(--border)] p-2.5">
                  <p className="text-[10px] text-3">Total</p>
                  <p className="text-lg font-semibold num-tabular">{insights.total}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-2.5">
                  <p className="text-[10px] text-3">Active</p>
                  <p className="text-lg font-semibold num-tabular">{insights.activeCount}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-2.5">
                  <p className="text-[10px] text-3">Done</p>
                  <p className="text-lg font-semibold num-tabular">{insights.doneCount}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-3">Completion</span>
                  <span className="font-semibold num-tabular">{insights.completionRate}%</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${insights.completionRate}%` }} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Channel split" subtitle="Open follow-ups by channel" />
            <ul className="px-5 pb-5 space-y-2">
              {insights.channels.map((entry) => (
                <li key={entry.channel} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-2.5 py-2">
                  <span className="text-xs text-2">{entry.channel}</span>
                  <span className="text-sm font-semibold num-tabular">{entry.count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Ownership" subtitle="Active follow-up distribution" />
            <div className="px-5 pb-5 space-y-3">
              {insights.owners.length === 0 ? (
                <p className="text-xs text-3">No active follow-ups assigned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {insights.owners.map((entry) => (
                    <li key={entry.owner} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-2.5 py-2">
                      <span className="text-xs text-2 truncate">{entry.owner}</span>
                      <span className="text-sm font-semibold num-tabular">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              {insights.nextDue && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                  <p className="text-[10px] text-3 uppercase tracking-wide">Next due</p>
                  <p className="text-sm font-medium mt-0.5 truncate">{insights.nextDue.contact}</p>
                  <p className="text-xs text-3">{relativeTime(insights.nextDue.dueAt)} · {insights.nextDue.projectName}</p>
                </div>
              )}
            </div>
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

function FollowUpList({
  title,
  items,
  tone,
  onDone,
  doneMode = false,
  onRecover,
}: {
  title: string;
  items: ApiFollowUp[];
  tone: 'danger' | 'warning' | 'success';
  onDone?: (followUpId: string) => void;
  doneMode?: boolean;
  onRecover?: (followUpId: string, dueAt: string) => void;
}) {
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
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
            {(() => {
              const details = parseFollowUpNote(f.note);
              const phone = details.phone;
              const email = details.email;
              const whatsappPhone = toWhatsAppPhone(phone);
              const hasExtraDetails = Boolean(details.location || details.meetingWith || details.meetingTime || details.otherLines.length > 0);
              const isExpanded = Boolean(expandedById[f.id]);
              return (
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
                    <p className="mt-2 text-sm text-2 whitespace-pre-line">{details.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {phone && <Badge tone="neutral" className="!text-[10px]">Phone</Badge>}
                      {email && <Badge tone="neutral" className="!text-[10px]">Email</Badge>}
                      {details.location && <Badge tone="neutral" className="!text-[10px]">Location</Badge>}
                      {details.meetingWith && <Badge tone="neutral" className="!text-[10px]">Meeting with</Badge>}
                      {details.meetingTime && <Badge tone="neutral" className="!text-[10px]">Meeting time</Badge>}
                    </div>
                    {hasExtraDetails && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedById((prev) => ({
                            ...prev,
                            [f.id]: !isExpanded,
                          }))
                        }
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-brand-700 hover:underline"
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        Details
                      </button>
                    )}
                    {hasExtraDetails && isExpanded && (
                      <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 space-y-1.5 text-xs">
                        {details.location && <p><span className="text-3">Location:</span> {details.location}</p>}
                        {details.meetingWith && <p><span className="text-3">Meeting with:</span> {details.meetingWith}</p>}
                        {details.meetingTime && <p><span className="text-3">Meeting time:</span> {details.meetingTime}</p>}
                        {details.otherLines.map((line, index) => (
                          <p key={`${f.id}-extra-${index}`} className="text-2">{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-3">{relativeTime(f.dueAt)}</p>
                    <p className="text-[10px] text-3 mt-0.5">{new Date(f.dueAt).toLocaleString('en-AE')}</p>
                    <p className="text-[10px] text-3 mt-0.5 truncate max-w-[140px]">{f.ownerName ?? 'Unassigned'}</p>
                    <div className="mt-2 flex items-center gap-1">
                      {phone && (
                        <Button
                          type="button"
                          variant="soft"
                          size="sm"
                          className="!h-7 !px-2"
                          aria-label="Call"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.location.href = `tel:${phone}`;
                            }
                          }}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                      {whatsappPhone && (
                        <Button
                          type="button"
                          variant="soft"
                          size="sm"
                          className="!h-7 !px-2"
                          aria-label="WhatsApp"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.open(`https://wa.me/${whatsappPhone}`, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                      )}
                      {email && (
                        <Button
                          type="button"
                          variant="soft"
                          size="sm"
                          className="!h-7 !px-2"
                          aria-label="Email"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.location.href = `mailto:${email}`;
                            }
                          }}
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                      )}
                      {doneMode ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="!h-7 !px-2"
                          aria-label="Recover"
                          onClick={() => onRecover?.(f.id, f.dueAt)}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="!h-7 !px-2"
                          aria-label="Done"
                          onClick={() => onDone?.(f.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function parseFollowUpNote(note: string): {
  summary: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  meetingWith: string | null;
  meetingTime: string | null;
  otherLines: string[];
} {
  const lines = note
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let phone: string | null = null;
  let email: string | null = null;
  let location: string | null = null;
  let meetingWith: string | null = null;
  let meetingTime: string | null = null;
  const contentLines: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    const phoneMatch = line.match(/^Phone:\s*(.+)$/i);
    if (phoneMatch) {
      phone = phoneMatch[1].trim();
      continue;
    }
    const emailMatch = line.match(/^Email:\s*(.+)$/i);
    if (emailMatch) {
      email = emailMatch[1].trim();
      continue;
    }
    const locationMatch = line.match(/^Location:\s*(.+)$/i);
    if (locationMatch) {
      location = locationMatch[1].trim();
      continue;
    }
    const meetingWithMatch = line.match(/^Meeting with:\s*(.+)$/i);
    if (meetingWithMatch) {
      meetingWith = meetingWithMatch[1].trim();
      continue;
    }
    const meetingTimeMatch = line.match(/^Meeting time:\s*(.+)$/i);
    if (meetingTimeMatch) {
      meetingTime = meetingTimeMatch[1].trim();
      continue;
    }
    if (contentLines.length === 0) {
      contentLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  return {
    summary: contentLines[0] ?? note,
    phone,
    email,
    location,
    meetingWith,
    meetingTime,
    otherLines,
  };
}

function toWhatsAppPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function deriveStatus(followUp: ApiFollowUp): ApiFollowUp['status'] {
  if (followUp.status === 'Done') return 'Done';
  const now = Date.now();
  const due = new Date(followUp.dueAt).getTime();
  if (!Number.isFinite(due)) return followUp.status;
  if (due < now) return 'Overdue';
  const today = new Date();
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
  if (due <= endOfToday) return 'Due today';
  return 'Upcoming';
}

function computeStatusFromDueDate(dueAt: string): ApiFollowUp['status'] {
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return 'Upcoming';
  if (due < now) return 'Overdue';
  const today = new Date();
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
  if (due <= endOfToday) return 'Due today';
  return 'Upcoming';
}
