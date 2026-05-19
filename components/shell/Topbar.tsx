'use client';

import { Search, Bell, Sun, Moon, Plus, Command, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const [dark, setDark] = useState(false);

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
        <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} className="hidden md:inline-flex">
          New project
        </Button>
        <button
          onClick={toggle}
          className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-2 hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-all"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-2 hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-all relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-brand-600" />
        </button>
        <div className="pl-2 ml-1 border-l border-[var(--border)] flex items-center gap-2.5">
          <Avatar name="Karim Mansour" size="sm" online />
          <div className="hidden md:block leading-tight">
            <p className="text-xs font-semibold">Karim Mansour</p>
            <p className="text-[10px] text-3">Regional Sales — Dubai</p>
          </div>
        </div>
      </div>
    </header>
  );
}
