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
} from 'recharts';
import PeriodSelector from './PeriodSelector';
import StatCard from './StatCard';

export type Period = '7d' | '30d' | '3m' | 'all';

interface TrendChartProps {
  data: Array<{ date: string; count: number }>;
  title?: string;
}

export default function TrendChart({ data, title = 'Évolution des révisions' }: TrendChartProps) {
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
            Moyenne: <span className="font-semibold text-blue-600">{Math.round(stats.avg)}</span> cartes/jour
          </p>
        </div>
        <PeriodSelector selected={selectedPeriod} onChange={setSelectedPeriod} />
      </div>

      {/* Chart */}
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        {filteredData.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-zinc-500">Pas encore de données pour cette période</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradientV1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
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
                  border: '1px solid #27272a',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                }}
                labelStyle={{ color: '#a1a1aa', marginBottom: '0.25rem', fontSize: '0.875rem' }}
                itemStyle={{ color: '#fafafa', fontSize: '0.875rem', fontWeight: 600 }}
                cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '5 5' }}
              />

              <Line
                type="monotone"
                dataKey="count"
                name="Révisions"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{
                  fill: '#2563eb',
                  strokeWidth: 2,
                  stroke: '#18181b',
                  r: 4,
                }}
                activeDot={{
                  fill: '#3b82f6',
                  stroke: '#2563eb',
                  strokeWidth: 3,
                  r: 6,
                }}
                fill="url(#chartGradientV1)"
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          color="blue"
        />
        <StatCard
          label="Moyenne"
          value={Math.round(stats.avg)}
          color="blue"
        />
        <StatCard
          label="Maximum"
          value={stats.max}
          color="green"
        />
      </div>
    </div>
  );
}
