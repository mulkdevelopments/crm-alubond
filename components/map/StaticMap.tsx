'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
};

// GCC bounding box (rough). Longitude west-east, latitude south-north.
const BOUNDS = { minLng: 34.5, maxLng: 60.0, minLat: 16.0, maxLat: 30.5 };

function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
}

const TONES = {
  brand: 'bg-brand-600 shadow-[0_0_0_4px_rgba(227,6,19,0.18)]',
  success: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]',
  warning: 'bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.18)]',
  danger: 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.18)]',
  info: 'bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.18)]',
};

const SIZES = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StaticMap({
  pins,
  height = 'h-[420px]',
  showLabels = false,
  children,
  cities = true,
}: {
  pins: MapPin[];
  height?: string;
  showLabels?: boolean;
  children?: ReactNode;
  cities?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border border-[var(--border)] grid-bg',
        height,
      )}
      style={{
        backgroundColor: 'var(--surface)',
        backgroundImage:
          'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px), radial-gradient(circle at 30% 40%, rgba(227,6,19,0.04), transparent 50%)',
        backgroundSize: '40px 40px, 40px 40px, 100% 100%',
      }}
    >
      {/* stylized landmass — peninsula silhouette */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.35]" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--surface-2)" />
            <stop offset="100%" stopColor="var(--border-strong)" />
          </linearGradient>
        </defs>
        <path
          d="M 8 28 Q 18 18 32 22 Q 44 18 52 24 Q 60 22 66 30 Q 74 36 78 48 Q 82 62 76 72 Q 70 84 58 86 Q 46 92 36 86 Q 24 84 18 74 Q 10 62 8 50 Z"
          fill="url(#land)"
          stroke="var(--border-strong)"
          strokeWidth="0.3"
        />
        {/* coastline shimmer */}
        <path
          d="M 8 28 Q 18 18 32 22 Q 44 18 52 24 Q 60 22 66 30"
          fill="none"
          stroke="rgba(227,6,19,0.25)"
          strokeWidth="0.3"
        />
      </svg>

      {/* cities */}
      {cities && (
        <>
          {[
            { name: 'Dubai', lat: 25.20, lng: 55.27 },
            { name: 'Abu Dhabi', lat: 24.45, lng: 54.38 },
            { name: 'Riyadh', lat: 24.71, lng: 46.67 },
            { name: 'Doha', lat: 25.28, lng: 51.53 },
            { name: 'Muscat', lat: 23.58, lng: 58.38 },
            { name: 'Jeddah', lat: 21.73, lng: 39.10 },
          ].map((c) => {
            const { x, y } = project(c.lat, c.lng);
            return (
              <div
                key={c.name}
                className="absolute text-[9px] uppercase tracking-widest font-semibold text-3 select-none pointer-events-none"
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(8px, -50%)' }}
              >
                {c.name}
              </div>
            );
          })}
        </>
      )}

      {/* pins */}
      {pins.map((pin) => {
        const { x, y } = project(pin.lat, pin.lng);
        return (
          <div
            key={pin.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className={cn('rounded-full ring-2 ring-[var(--surface)]', TONES[pin.tone || 'brand'], SIZES[pin.size || 'md'])} />
            {pin.pulse && (
              <div className={cn('absolute inset-0 rounded-full animate-ping opacity-50', TONES[pin.tone || 'brand'])} />
            )}
            {showLabels && pin.label && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-[10px] font-medium surface border border-[var(--border)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {pin.label}
              </div>
            )}
          </div>
        );
      })}

      {/* legend / children overlay */}
      {children && <div className="absolute bottom-3 left-3 right-3 z-10">{children}</div>}

      {/* compass */}
      <div className="absolute top-3 right-3 h-9 w-9 rounded-full surface border border-[var(--border)] flex items-center justify-center text-[10px] font-bold">
        N
      </div>
    </div>
  );
}
