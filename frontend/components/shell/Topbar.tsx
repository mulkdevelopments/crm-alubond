'use client';

import Link from 'next/link';
import { Search, Bell, Sun, Moon, Command, Menu, Check, X, MapPin, AlertTriangle, Clock3, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/components/auth/AuthContext';
import { listFollowUps } from '@/lib/followups-api';
import { listProjectActivities, listProjects } from '@/lib/projects-api';

type TopbarNotification = {
  id: string;
  title: string;
  description: string;
  whenIso: string;
  href: string;
  tone: 'danger' | 'warning' | 'info';
};

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const [dark, setDark] = useState(false);
  const { locationTelemetry, token, user } = useAuth();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<TopbarNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsSeenAtMs, setNotificationsSeenAtMs] = useState(0);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  }

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(`alubond-notification-seen-at:${user.id}`);
    const parsed = raw ? Number(raw) : 0;
    setNotificationsSeenAtMs(Number.isFinite(parsed) ? parsed : 0);
  }, [user?.id]);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setNotificationsError(null);
      return;
    }

    let cancelled = false;
    async function loadNotifications() {
      setNotificationsLoading(true);
      setNotificationsError(null);
      try {
        const [followUps, projects] = await Promise.all([listFollowUps(token), listProjects(token)]);
        if (cancelled) return;
        const now = Date.now();
        const followUpNotifications: TopbarNotification[] = followUps
          .filter((item) => item.status === 'Overdue' || item.status === 'Due today')
          .slice(0, 8)
          .map((item) => ({
            id: `followup-${item.id}`,
            title: item.status === 'Overdue' ? 'Overdue follow-up' : 'Follow-up due today',
            description: `${item.projectName} · ${item.contact} · ${item.channel}`,
            whenIso: item.updatedAt || item.dueAt,
            href: '/follow-ups',
            tone: item.status === 'Overdue' ? 'danger' : 'warning',
          }));

        const recentProjectNotifications: TopbarNotification[] = projects
          .filter((project) => {
            const updatedMs = new Date(project.updatedAt).getTime();
            return Number.isFinite(updatedMs) && now - updatedMs <= 24 * 60 * 60 * 1000;
          })
          .slice(0, 6)
          .map((project) => ({
            id: `project-${project.id}`,
            title: `Project updated · ${project.stage}`,
            description: `${project.name} · ${project.city}, ${project.country}`,
            whenIso: project.updatedAt,
            href: `/projects/${project.id}`,
            tone: 'info',
          }));

        const projectsForActivityFeed = projects.slice(0, 6);
        const activityBuckets = await Promise.all(
          projectsForActivityFeed.map(async (project) => {
            try {
              const items = await listProjectActivities(token, project.id);
              return items.map((activity) => ({ activity, project }));
            } catch {
              return [] as Array<{
                activity: Awaited<ReturnType<typeof listProjectActivities>>[number];
                project: (typeof projectsForActivityFeed)[number];
              }>;
            }
          })
        );
        if (cancelled) return;

        const activityNotifications: TopbarNotification[] = activityBuckets
          .flat()
          .filter((entry) => {
            const createdMs = new Date(entry.activity.createdAt).getTime();
            return Number.isFinite(createdMs) && now - createdMs <= 24 * 60 * 60 * 1000;
          })
          .sort((a, b) => new Date(b.activity.createdAt).getTime() - new Date(a.activity.createdAt).getTime())
          .slice(0, 8)
          .map(({ activity, project }) => {
            const isVisitWithoutRecap =
              activity.type === 'visit' &&
              (activity.visitWhatHappened == null || activity.visitWhatHappened.trim().length === 0);
            const firstLine = activity.message.split('\n')[0]?.trim() || 'Activity update';
            return {
              id: `activity-${activity.id}`,
              title: isVisitWithoutRecap
                ? 'Visit logged · recap pending'
                : `Activity logged · ${activity.type}`,
              description: `${project.name} · ${activity.createdByName ?? 'System'} · ${firstLine}`,
              whenIso: activity.createdAt,
              href: `/projects/${project.id}`,
              tone: isVisitWithoutRecap ? 'warning' : 'info',
            };
          });

        const merged = [...followUpNotifications, ...recentProjectNotifications, ...activityNotifications]
          .sort((a, b) => new Date(b.whenIso).getTime() - new Date(a.whenIso).getTime())
          .slice(0, 12);
        setNotifications(merged);
      } catch {
        if (!cancelled) {
          setNotificationsError('Failed to load notifications.');
        }
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    }

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    if (!notificationOpen) return;
    function onGlobalClick(event: MouseEvent) {
      if (!notificationPanelRef.current) return;
      if (notificationPanelRef.current.contains(event.target as Node)) return;
      setNotificationOpen(false);
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setNotificationOpen(false);
    }
    window.addEventListener('mousedown', onGlobalClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onGlobalClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [notificationOpen]);

  const nextPingMs = locationTelemetry.nextPingAt ? new Date(locationTelemetry.nextPingAt).getTime() : null;
  const remainingMs = nextPingMs ? Math.max(0, nextPingMs - nowMs) : 0;
  const countdownSeconds = Math.ceil(remainingMs / 1000);
  const progress = Math.max(0, Math.min(1, remainingMs / 60_000));
  const circleRadius = 10;
  const circumference = 2 * Math.PI * circleRadius;
  const dashOffset = circumference * (1 - progress);
  const locationLabel = locationTelemetry.lastLocationName ?? null;
  const lastSeenLabel = locationTelemetry.lastPingAt
    ? `Last visit ${relativeAgo(locationTelemetry.lastPingAt, nowMs)}`
    : "No visit logs yet";
  const hasLocationInfo =
    Boolean(locationTelemetry.lastLocationName) || Boolean(locationTelemetry.lastPingAt);
  const unreadCount = useMemo(
    () =>
      notifications.filter((item) => {
        const ts = new Date(item.whenIso).getTime();
        return Number.isFinite(ts) && ts > notificationsSeenAtMs;
      }).length,
    [notifications, notificationsSeenAtMs]
  );

  function markAllNotificationsRead() {
    const now = Date.now();
    setNotificationsSeenAtMs(now);
    if (user?.id && typeof window !== 'undefined') {
      window.localStorage.setItem(`alubond-notification-seen-at:${user.id}`, String(now));
    }
  }

  return (
    <header className="sticky top-0 z-30 h-16 px-4 lg:px-8 flex items-center justify-between gap-4 surface/80 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <button onClick={onMenu} className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)]">
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-3" />
          <input
            type="text"
            placeholder="Search projects, contacts, architects…"
            className="w-full h-10 pl-10 pr-20 rounded-xl bg-[var(--surface-2)] border border-transparent hover:border-[var(--border)] focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-brand-600/20 text-sm placeholder:text-3 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-[10px] text-3">
            <span className="kbd"><Command className="h-2.5 w-2.5 inline" />K</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {hasLocationInfo && (
          <div className="hidden md:flex items-center gap-2 h-9 pl-2 pr-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {locationLabel && (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-2">
                  <MapPin className="h-3.5 w-3.5" />
                  Visit location
                </span>
                <span className="max-w-[150px] truncate text-[11px] text-3" title={locationLabel}>
                  {locationLabel}
                </span>
              </>
            )}
            <span
              className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]"
              title={
                locationTelemetry.lastPingSuccess == null
                  ? 'Awaiting first ping'
                  : locationTelemetry.lastPingSuccess
                    ? 'Last ping success'
                    : 'Last ping failed'
              }
            >
              {locationTelemetry.lastPingSuccess == null ? (
                <span className="text-[10px] text-3">…</span>
              ) : locationTelemetry.lastPingSuccess ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <X className="h-3.5 w-3.5 text-rose-600" />
              )}
            </span>
            {nextPingMs ? (
              <div className="relative h-6 w-6" title={`Next ping in ${countdownSeconds}s`}>
                <svg viewBox="0 0 24 24" className="h-6 w-6 -rotate-90">
                  <circle cx="12" cy="12" r={circleRadius} className="fill-none stroke-[var(--border)]" strokeWidth="2" />
                  <circle
                    cx="12"
                    cy="12"
                    r={circleRadius}
                    className="fill-none stroke-brand-600 transition-all"
                    strokeWidth="2"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-[9px] font-semibold num-tabular">
                  {countdownSeconds}
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-3" title={locationTelemetry.lastPingAt ? new Date(locationTelemetry.lastPingAt).toLocaleString('en-AE') : undefined}>
                {lastSeenLabel}
              </span>
            )}
          </div>
        )}
        <button
          onClick={toggle}
          className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-2 hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-all"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="relative" ref={notificationPanelRef}>
          <button
            type="button"
            onClick={() => setNotificationOpen((prev) => !prev)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-2 hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-all relative"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold inline-flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-brand-600" />
            )}
          </button>
          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-soft z-50 overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-[var(--border)] flex items-center justify-between gap-2">
                <p className="text-sm font-semibold tracking-tight">Notifications</p>
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-[11px] text-brand-700 hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[340px] overflow-y-auto">
                {notificationsLoading ? (
                  <p className="px-3.5 py-3 text-xs text-3">Loading notifications...</p>
                ) : notificationsError ? (
                  <p className="px-3.5 py-3 text-xs text-rose-600">{notificationsError}</p>
                ) : notifications.length === 0 ? (
                  <p className="px-3.5 py-3 text-xs text-3">No new alerts.</p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {notifications.map((item) => {
                      const isUnread = new Date(item.whenIso).getTime() > notificationsSeenAtMs;
                      return (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            onClick={() => setNotificationOpen(false)}
                            className="block px-3.5 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5">
                                {item.tone === 'danger' ? (
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                ) : item.tone === 'warning' ? (
                                  <Clock3 className="h-3.5 w-3.5 text-amber-600" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-[var(--text)] truncate">{item.title}</p>
                                <p className="text-[11px] text-3 truncate">{item.description}</p>
                                <p className="text-[10px] text-3 mt-0.5">{relativeAgo(item.whenIso, nowMs)}</p>
                              </div>
                              {isUnread && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-600" />}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function relativeAgo(iso: string, nowMs: number) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "unknown";
  const diffSec = Math.max(0, Math.round((nowMs - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
