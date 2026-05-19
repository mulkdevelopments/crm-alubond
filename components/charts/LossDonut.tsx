'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#E30613', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#6E6E76'];

export function LossDonut({ data }: { data: { reason: string; value: number }[] }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-[180px] w-[180px] relative shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="reason"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}%`, 'Share']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold tracking-tight font-display">{data[0].value}<span className="text-base text-3">%</span></span>
          <span className="text-[10px] uppercase tracking-widest text-3 mt-1">Top reason</span>
        </div>
      </div>
      <ul className="space-y-2 flex-1 min-w-0">
        {data.map((d, i) => (
          <li key={d.reason} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="truncate text-2">{d.reason}</span>
            </span>
            <span className="font-semibold num-tabular">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
