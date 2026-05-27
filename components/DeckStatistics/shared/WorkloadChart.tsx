'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CARD_CATEGORY_COLORS, CHART_COLORS } from '@/lib/cardCategories';

export interface WorkloadForecast {
  dueToday: number;
  dueTomorrow: number;
  due7d: number;
  due30d: number;
  dailyLoadAvg: number;
  dailyForecast: Array<{
    date: string;
    learning: number;
    young: number;
    mature: number;
    count: number;
  }>;
}

interface WorkloadChartProps {
  forecast: WorkloadForecast;
}

type RangeKey = '1m' | '3m' | '1y';

const RANGES: Array<{ key: RangeKey; label: string; days: number; bucket: number }> = [
  { key: '1m', label: '1 mois', days: 30, bucket: 1 },
  { key: '3m', label: '3 mois', days: 90, bucket: 7 },
  { key: '1y', label: '1 an', days: 365, bucket: 7 },
];

// Couleurs alignées sur la source unique (lib/cardCategories).
const COLORS = {
  learning: CARD_CATEGORY_COLORS.learning,
  young: CARD_CATEGORY_COLORS.young,
  mature: CARD_CATEGORY_COLORS.mature,
};

function formatBucketLabel(dateStr: string, bucketDays: number): string {
  const d = new Date(dateStr);
  if (bucketDays === 1) {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function WorkloadChart({ forecast }: WorkloadChartProps) {
  const [range, setRange] = useState<RangeKey>('1m');

  const { data, total } = useMemo(() => {
    const cfg = RANGES.find(r => r.key === range)!;
    const slice = forecast.dailyForecast.slice(0, cfg.days);

    // Regroupement par buckets (1 jour ou 7 jours selon la plage).
    const buckets: Array<{
      label: string;
      learning: number;
      young: number;
      mature: number;
      count: number;
    }> = [];
    for (let i = 0; i < slice.length; i += cfg.bucket) {
      const chunk = slice.slice(i, i + cfg.bucket);
      const learning = chunk.reduce((s, d) => s + d.learning, 0);
      const young = chunk.reduce((s, d) => s + d.young, 0);
      const mature = chunk.reduce((s, d) => s + d.mature, 0);
      buckets.push({
        label: formatBucketLabel(chunk[0].date, cfg.bucket),
        learning,
        young,
        mature,
        count: learning + young + mature,
      });
    }

    // Courbe cumulative (nombre total de cartes à réviser sur la plage).
    let running = 0;
    const withCumulative = buckets.map(b => {
      running += b.count;
      return { ...b, cumulative: running };
    });

    return { data: withCumulative, total: running };
  }, [forecast, range]);

  const hasData = total > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Charge de travail</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Prévision du nombre de cartes à réviser selon leur jour d'échéance et leur statut.
          </p>
        </div>
        {/* Sélecteur de plage façon Anki */}
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 self-start">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                range === r.key
                  ? 'bg-zinc-700 text-foreground'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-zinc-500">Aucune révision planifiée sur cette période</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickLine={{ stroke: '#3f3f46' }}
                interval={Math.max(0, Math.floor(data.length / 10))}
              />
              <YAxis
                yAxisId="left"
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                tickLine={{ stroke: '#3f3f46' }}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 11 }}
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
                itemStyle={{ fontSize: '0.8125rem' }}
                cursor={{ fill: '#27272a', opacity: 0.4 }}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }} />
              <Bar yAxisId="left" dataKey="learning" name="Apprentissage" stackId="a" fill={COLORS.learning} />
              <Bar yAxisId="left" dataKey="young" name="Jeunes" stackId="a" fill={COLORS.young} />
              <Bar yAxisId="left" dataKey="mature" name="Matures" stackId="a" fill={COLORS.mature} radius={[3, 3, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                name="Cumul"
                stroke={CHART_COLORS.accent}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* KPIs façon Anki */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Aujourd'hui" value={forecast.dueToday} color="text-orange-400" />
        <Kpi label="Demain" value={forecast.dueTomorrow} color="text-orange-400" />
        <Kpi label="7 prochains jours" value={forecast.due7d} color="text-blue-400" />
        <Kpi
          label="Charge journalière"
          value={forecast.dailyLoadAvg}
          suffix=" /j"
          color="text-purple-400"
        />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs text-zinc-400 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>
        {value}
        {suffix ?? ''}
      </div>
    </div>
  );
}
