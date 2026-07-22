'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Database,
  LayoutDashboard,
  KanbanSquare,
  MapPin,
  Bell,
  BookOpen,
  MessageCircle,
  Trash2,
  UserCog,
  UserCircle2,
  UserPlus,
  Users,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthContext';
import { BrandMark } from '@/components/brand/BrandLogo';
import { FEEDBACK_WHATSAPP_URL } from '@/lib/feedback';
import { listFollowUps } from '@/lib/followups-api';
import { getPendingAccessRequestCount } from '@/lib/access-requests-api';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  external?: boolean;
};

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/map', label: 'Geo Intel', icon: MapPin },
  { href: '/follow-ups', label: 'Follow-ups', icon: Bell },
  { href: '/team', label: 'Field Team', icon: Users },
  { href: '/trash', label: 'Trash', icon: Trash2 },
  { href: '/docs', label: 'Docs', icon: BookOpen },
  {
    href: FEEDBACK_WHATSAPP_URL,
    label: 'Report issue',
    icon: MessageCircle,
    external: true,
  },
];

function canSeeFieldTeam(role: string | undefined) {
  return role === 'MANAGER' || role === 'REGIONAL_MANAGER' || role === 'CEO' || role === 'ADMIN';
}

export function Sidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, token } = useAuth();
  const [followUpBadgeCount, setFollowUpBadgeCount] = useState<number | null>(null);
  const [accessRequestBadgeCount, setAccessRequestBadgeCount] = useState<number | null>(null);
  const baseNav = canSeeFieldTeam(user?.role) ? NAV : NAV.filter((item) => item.href !== '/team');
  const navItems: NavItem[] =
    user?.role === 'ADMIN'
      ? [
          ...baseNav.slice(0, canSeeFieldTeam(user?.role) ? 5 : 4),
          { href: '/access-requests', label: 'Access requests', icon: UserPlus },
          { href: '/users', label: 'Users', icon: UserCog },
          { href: '/master-data', label: 'Master Data', icon: Database },
          ...baseNav.slice(canSeeFieldTeam(user?.role) ? 5 : 4),
        ]
      : baseNav;
  const userName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || 'User';

  useEffect(() => {
    async function loadFollowUpsCount() {
      if (!token) {
        setFollowUpBadgeCount(null);
        return;
      }
      try {
        const items = await listFollowUps(token);
        setFollowUpBadgeCount(items.filter((item) => item.status !== 'Done').length);
      } catch {
        setFollowUpBadgeCount(null);
      }
    }
    void loadFollowUpsCount();
  }, [token]);

  useEffect(() => {
    async function loadAccessRequestCount() {
      if (!token || user?.role !== 'ADMIN') {
        setAccessRequestBadgeCount(null);
        return;
      }
      try {
        const count = await getPendingAccessRequestCount(token);
        setAccessRequestBadgeCount(count);
      } catch {
        setAccessRequestBadgeCount(null);
      }
    }
    void loadAccessRequestCount();
  }, [token, user?.role]);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 z-20 border-r border-[var(--border)] surface transition-all',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="Alubond home">
          <BrandMark size={collapsed ? 'sm' : 'md'} priority />
          {!collapsed && (
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-bold tracking-tight truncate">Alubond</span>
              <span className="text-[10px] text-3 mt-0.5 tracking-wider uppercase whitespace-nowrap">
                Sales Intelligence
              </span>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badge, external }) => {
          const active = !external && (href === '/' ? path === '/' : path.startsWith(href));
          const resolvedBadge =
            href === '/follow-ups' && followUpBadgeCount != null
              ? String(followUpBadgeCount)
              : href === '/access-requests' && accessRequestBadgeCount != null && accessRequestBadgeCount > 0
                ? String(accessRequestBadgeCount)
                : badge;
          const itemClassName = cn(
            'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
            active
              ? 'bg-[var(--surface-2)] text-[var(--text)]'
              : 'text-2 hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
            collapsed && 'justify-center px-0',
          );
          const itemContent = (
            <>
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-brand-600 rounded-r" />
              )}
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-brand-600')} strokeWidth={2.2} />
              {!collapsed && (
                <>
                  <span className="truncate flex-1">{label}</span>
                  {resolvedBadge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold tracking-wider bg-brand-600 text-white">
                      {resolvedBadge}
                    </span>
                  )}
                </>
              )}
            </>
          );

          if (external) {
            return (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClassName}
                aria-label={`${label} on WhatsApp`}
              >
                {itemContent}
              </a>
            );
          }

          return (
            <Link key={href} href={href} className={itemClassName}>
              {itemContent}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border)]">
        {!collapsed && (
          <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-3 mb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-3">Logged in as</p>
                <p className="text-xs font-semibold truncate">{userName}</p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/profile"
                  aria-label="Open profile"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-2 hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all"
                >
                  <UserCircle2 className="h-4 w-4" />
                </Link>
                <button
                  onClick={logout}
                  aria-label="Logout"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-500/10 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl text-xs text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
