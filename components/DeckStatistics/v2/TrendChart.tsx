'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PeriodSelector, type Period } from './PeriodSelector';

interface TrendChartProps {
  data: Array<{ date: string; count: number }>;
  title?: string;
}

export function TrendChart({ data, title = 'Évolution des révisions' }: TrendChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('7d');

  const filteredData = useMemo(() => {
    const now = new Date();
    let cutoffDate = new Date();

    switch (selectedPeriod) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'all':
        cutoffDate = new Date(0);
        break;
    }

    const filtered = data.filter(item => new Date(item.date) >= cutoffDate);

    // Format dates for display
    return filtered.map(item => ({
      ...item,
      displayDate: new Date(item.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      }),
    }));
  }, [data, selectedPeriod]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avg: 0, max: 0, total: 0 };

    const counts = filteredData.map(d => d.count);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const avg = total / counts.length;
    const max = Math.max(...counts);

    return { avg, max, total };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {title}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Moyenne: <span className="font-semibold text-cyan-400">{Math.round(stats.avg)}</span> cartes/jour
          </p>
        </div>
        <PeriodSelector selected={selectedPeriod} onChange={setSelectedPeriod} />
      </div>

      {/* Chart */}
      <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-6 backdrop-blur-sm">
        {filteredData.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-zinc-500">Pas encore de données pour cette période</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />

              <XAxis
                dataKey="displayDate"
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
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
                  border: '1px solid #3f3f46',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                }}
                labelStyle={{ color: '#a1a1aa', marginBottom: '0.25rem', fontSize: '0.875rem' }}
                itemStyle={{ color: '#fafafa', fontSize: '0.875rem', fontWeight: 600 }}
                cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '5 5' }}
              />

              <Line
                type="monotone"
                dataKey="count"
                name="Révisions"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{
                  fill: '#06b6d4',
                  strokeWidth: 2,
                  stroke: '#18181b',
                  r: 4,
                }}
                activeDot={{
                  fill: '#22d3ee',
                  stroke: '#06b6d4',
                  strokeWidth: 3,
                  r: 6,
                }}
                fill="url(#chartGradient)"
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-700/30 bg-zinc-900/30 p-3 text-center">
          <p className="text-xs text-zinc-500">Total</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-cyan-400">
            {stats.total}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-700/30 bg-zinc-900/30 p-3 text-center">
          <p className="text-xs text-zinc-500">Moyenne</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-blue-400">
            {Math.round(stats.avg)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-700/30 bg-zinc-900/30 p-3 text-center">
          <p className="text-xs text-zinc-500">Maximum</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-green-400">
            {stats.max}
          </p>
        </div>
      </div>
    </div>
  );
}
