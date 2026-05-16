'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatCard from '../StatCard';

interface ForecastChartProps {
  dailyForecast: Array<{ date: string; count: number }>;
  dueToday: number;
  due7d: number;
  due30d: number;
}

export default function ForecastChart({
  dailyForecast,
  dueToday,
  due7d,
  due30d,
}: ForecastChartProps) {
  const data = useMemo(
    () =>
      dailyForecast.map(item => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        }),
      })),
    [dailyForecast]
  );

  const max = useMemo(
    () => Math.max(0, ...dailyForecast.map(d => d.count)),
    [dailyForecast]
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Prévision de charge (30 jours)
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Nombre de cartes à réviser chaque jour selon le calendrier FSRS
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        {max === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-zinc-500">Aucune révision planifiée</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickLine={{ stroke: '#3f3f46' }}
                interval={Math.floor(data.length / 8)}
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
              <Bar
                dataKey="count"
                name="Cartes à réviser"
                fill="#f97316"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Aujourd'hui" value={dueToday} color="orange" />
        <StatCard label="7 prochains jours" value={due7d} color="orange" />
        <StatCard label="30 prochains jours" value={due30d} color="blue" />
      </div>
    </div>
  );
}
