'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  KanbanSquare,
  MapPin,
  Bell,
  Users2,
  Sparkles,
  Crown,
  FileText,
  HardHat,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/map', label: 'Geo Intel', icon: MapPin, badge: 'LIVE' },
  { href: '/follow-ups', label: 'Follow-ups', icon: Bell, badge: '7' },
  { href: '/relationships', label: 'Specifiers', icon: Users2 },
  { href: '/team', label: 'Field Team', icon: HardHat },
  { href: '/quotations', label: 'Quotations', icon: FileText },
  { href: '/ai', label: 'AI Assistant', icon: Sparkles },
  { href: '/ceo', label: 'CEO Center', icon: Crown },
];

export function Sidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)] surface transition-all',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--border)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-black text-sm shrink-0 shadow-brand">
          A
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="font-bold tracking-tight">Alubond</span>
            <span className="text-[10px] text-3 mt-0.5 tracking-wider uppercase">Sales Intelligence</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
                active
                  ? 'bg-[var(--surface-2)] text-[var(--text)]'
                  : 'text-2 hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
                collapsed && 'justify-center px-0',
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-brand-600 rounded-r" />
              )}
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-brand-600')} strokeWidth={2.2} />
              {!collapsed && (
                <>
                  <span className="truncate flex-1">{label}</span>
                  {badge && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-md font-bold tracking-wider',
                        badge === 'LIVE'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 animate-pulse-soft'
                          : 'bg-brand-600 text-white',
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border)]">
        {!collapsed && (
          <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white mb-3 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
            <Sparkles className="h-4 w-4 mb-2" />
            <p className="text-xs font-semibold leading-tight">Weekly AI summary ready</p>
            <p className="text-[11px] opacity-80 mt-0.5">+18% win-rate uplift possible</p>
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
