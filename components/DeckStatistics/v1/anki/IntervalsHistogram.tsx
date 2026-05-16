'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface IntervalsHistogramProps {
  data: {
    i1: number;
    i7: number;
    i30: number;
    i90: number;
    i180: number;
    iMax: number;
  };
}

const BUCKETS: Array<{ key: keyof IntervalsHistogramProps['data']; label: string; color: string }> = [
  { key: 'i1', label: '1 jour', color: '#ef4444' },
  { key: 'i7', label: '2–7 j', color: '#f97316' },
  { key: 'i30', label: '8–30 j', color: '#eab308' },
  { key: 'i90', label: '1–3 mois', color: '#22c55e' },
  { key: 'i180', label: '3–6 mois', color: '#3b82f6' },
  { key: 'iMax', label: '> 6 mois', color: '#a855f7' },
];

export default function IntervalsHistogram({ data }: IntervalsHistogramProps) {
  const chartData = BUCKETS.map(b => ({
    label: b.label,
    count: data[b.key],
    color: b.color,
  }));
  const total = chartData.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Distribution des intervalles
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          {total} carte{total > 1 ? 's' : ''} planifiée{total > 1 ? 's' : ''} — plus l'intervalle
          est long, plus la mémorisation est durable
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        {total === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-zinc-500">Pas encore d'intervalles calculés</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickLine={{ stroke: '#3f3f46' }}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                tickLine={{ stroke: '#3f3f46' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                }}
                labelStyle={{ color: '#a1a1aa', marginBottom: '0.25rem', fontSize: '0.875rem' }}
                itemStyle={{ color: '#fafafa', fontSize: '0.875rem', fontWeight: 600 }}
                cursor={{ fill: '#27272a', opacity: 0.4 }}
              />
              <Bar dataKey="count" name="Cartes" radius={[4, 4, 0, 0]} animationDuration={800}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
