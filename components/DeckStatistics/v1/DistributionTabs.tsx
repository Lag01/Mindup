'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface DistributionTabsProps {
  ratingDistribution: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

const ratingColors = {
  again: '#ef4444',
  hard: '#f97316',
  good: '#06b6d4',
  easy: '#10b981',
};

export default function DistributionTabs({ ratingDistribution }: DistributionTabsProps) {
  const total = Object.values(ratingDistribution).reduce((sum, val) => sum + val, 0);

  const ratingData = [
    {
      name: 'À revoir',
      value: ratingDistribution.again,
      percentage: total > 0 ? (ratingDistribution.again / total) * 100 : 0,
      color: ratingColors.again,
    },
    {
      name: 'Difficile',
      value: ratingDistribution.hard,
      percentage: total > 0 ? (ratingDistribution.hard / total) * 100 : 0,
      color: ratingColors.hard,
    },
    {
      name: 'Bon',
      value: ratingDistribution.good,
      percentage: total > 0 ? (ratingDistribution.good / total) * 100 : 0,
      color: ratingColors.good,
    },
    {
      name: 'Facile',
      value: ratingDistribution.easy,
      percentage: total > 0 ? (ratingDistribution.easy / total) * 100 : 0,
      color: ratingColors.easy,
    },
  ];

  return (
    <Tabs defaultValue="ratings" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800">
        <TabsTrigger value="ratings" className="data-[state=active]:bg-zinc-800">
          Par Rating
        </TabsTrigger>
        <TabsTrigger value="details" className="data-[state=active]:bg-zinc-800">
          Détails
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ratings" className="mt-6 space-y-4">
        {/* Chart */}
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h4 className="mb-4 text-sm font-semibold text-foreground">
            Distribution des réponses
          </h4>

          {total === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-zinc-500">Aucune révision encore</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={ratingData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <XAxis type="number" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#52525b"
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  width={90}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ratingData.map((rating) => (
            <div
              key={rating.name}
              className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
            >
              {/* Color Indicator */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5"
                style={{ backgroundColor: rating.color }}
              />

              <div className="pl-2">
                <p className="text-xs text-zinc-400">{rating.name}</p>
                <p
                  className="mt-1 text-2xl font-bold tabular-nums"
                  style={{ color: rating.color }}
                >
                  {rating.value}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {rating.percentage.toFixed(1)}%
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${rating.percentage}%`,
                    backgroundColor: rating.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="details" className="mt-6 space-y-4">
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          {/* Stats Grid */}
          <div className="divide-y divide-zinc-800">
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-zinc-400">Total révisions</span>
              <span className="text-lg font-bold tabular-nums text-foreground">{total}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-zinc-400">Taux de succès</span>
              <span className="text-lg font-bold tabular-nums text-green-400">
                {total > 0
                  ? (((ratingDistribution.good + ratingDistribution.easy) / total) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-zinc-400">Réponses positives</span>
              <span className="text-lg font-bold tabular-nums text-cyan-400">
                {ratingDistribution.good + ratingDistribution.easy}
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-zinc-400">Réponses négatives</span>
              <span className="text-lg font-bold tabular-nums text-orange-400">
                {ratingDistribution.again + ratingDistribution.hard}
              </span>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
