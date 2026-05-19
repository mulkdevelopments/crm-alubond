'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

export function TrendChart({ data }: { data: { month: string; target: number; achieved: number }[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="achv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E30613" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#E30613" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="tgt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8E8E96" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#8E8E96" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickFormatter={(v) => `${v}M`} />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              fontSize: 12,
              boxShadow: '0 8px 24px -8px rgba(0,0,0,0.18)',
            }}
            labelStyle={{ color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}
            formatter={(v: number, name) => [`AED ${v}M`, name === 'achieved' ? 'Achieved' : 'Target']}
          />
          <Area type="monotone" dataKey="target" stroke="#8E8E96" strokeWidth={1.5} fill="url(#tgt)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="achieved" stroke="#E30613" strokeWidth={2.5} fill="url(#achv)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
