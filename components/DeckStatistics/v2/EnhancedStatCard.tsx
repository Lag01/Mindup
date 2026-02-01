'use client';

import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface EnhancedStatCardProps {
  label: string;
  value: number | string;
  icon: string;
  gradient: string;
  trend?: {
    value: number;
    label: string;
  };
  sparkline?: number[];
}

export function EnhancedStatCard({
  label,
  value,
  icon,
  gradient,
  trend,
  sparkline,
}: EnhancedStatCardProps) {
  const sparklineData = useMemo(() => {
    if (!sparkline) return [];
    return sparkline.map((value, index) => ({ index, value }));
  }, [sparkline]);

  const trendColor = useMemo(() => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-emerald-400';
    if (trend.value < 0) return 'text-red-400';
    return 'text-zinc-400';
  }, [trend]);

  const trendIcon = useMemo(() => {
    if (!trend) return '';
    if (trend.value > 0) return '↗';
    if (trend.value < 0) return '↘';
    return '→';
  }, [trend]);

  return (
    <div className="group relative h-full">
      {/* Corner Accent */}
      <div className="absolute left-0 top-0 h-2 w-2 rounded-br-sm bg-cyan-400/80 transition-all group-hover:h-3 group-hover:w-3" />

      {/* Main Card */}
      <div className="relative h-full overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-900/90 backdrop-blur-sm transition-all duration-300 group-hover:border-zinc-600/70 group-hover:shadow-lg">
        {/* Glow Effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20`}
          aria-hidden="true"
        />

        {/* Content Container */}
        <div className="relative z-10 flex h-full flex-col justify-between p-4">
          {/* Header: Label + Icon */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 transition-colors group-hover:text-zinc-300">
              {label}
            </span>
            <span className="text-xl leading-none opacity-60 transition-opacity group-hover:opacity-100">
              {icon}
            </span>
          </div>

          {/* Value Section */}
          <div className="mt-3 space-y-2">
            {/* Main Value */}
            <div className="flex items-baseline gap-2">
              <span
                className={`bg-gradient-to-br ${gradient} bg-clip-text text-3xl font-bold tabular-nums text-transparent transition-all`}
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
              >
                {value}
              </span>

              {/* Trend Indicator */}
              {trend && (
                <span className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${trendColor} transition-colors`}>
                  <span className="text-base leading-none">{trendIcon}</span>
                  <span>{trend.value > 0 ? '+' : ''}{trend.value}{trend.label.includes('%') ? '' : ''}</span>
                </span>
              )}
            </div>

            {/* Trend Label */}
            {trend && (
              <p className="text-xs text-zinc-500">
                {trend.label}
              </p>
            )}

            {/* Sparkline Chart */}
            {sparkline && sparkline.length > 0 && (
              <div className="mt-3 h-10 w-full opacity-60 transition-opacity duration-300 group-hover:opacity-100">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id={`sparkline-gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" className="text-cyan-400" stopColor="currentColor" stopOpacity={0.6} />
                        <stop offset="100%" className="text-cyan-600" stopColor="currentColor" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="url(#sparkline-gradient-${label})"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Gradient Bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} opacity-40 transition-all duration-300 group-hover:h-1 group-hover:opacity-70`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
