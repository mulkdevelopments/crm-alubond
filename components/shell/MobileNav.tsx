'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, KanbanSquare, MapPin, Bell, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/map', label: 'Map', icon: MapPin },
  { href: '/follow-ups', label: 'Tasks', icon: Bell },
  { href: '/ai', label: 'AI', icon: Sparkles },
];

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40 surface border border-[var(--border-strong)] rounded-2xl shadow-pop backdrop-blur-xl">
      <ul className="flex items-center justify-around py-1.5 px-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors',
                  active ? 'text-brand-600' : 'text-3 hover:text-[var(--text)]',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
