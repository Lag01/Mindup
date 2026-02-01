'use client';

import Link from 'next/link';
import { type Insight } from '@/lib/insights-generator';

const variantStyles = {
  positive: {
    background: 'bg-gradient-to-br from-green-900/20 to-emerald-900/10',
    border: 'border-green-700/30 hover:border-green-600/50',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    titleColor: 'text-green-100',
    glowColor: 'from-green-500/20 to-emerald-500/20',
    accentBar: 'bg-gradient-to-r from-green-500 to-emerald-500',
  },
  warning: {
    background: 'bg-gradient-to-br from-orange-900/20 to-red-900/10',
    border: 'border-orange-700/30 hover:border-orange-600/50',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    titleColor: 'text-orange-100',
    glowColor: 'from-orange-500/20 to-red-500/20',
    accentBar: 'bg-gradient-to-r from-orange-500 to-red-500',
  },
  suggestion: {
    background: 'bg-gradient-to-br from-blue-900/20 to-cyan-900/10',
    border: 'border-blue-700/30 hover:border-blue-600/50',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    titleColor: 'text-blue-100',
    glowColor: 'from-blue-500/20 to-cyan-500/20',
    accentBar: 'bg-gradient-to-r from-blue-500 to-cyan-500',
  },
  milestone: {
    background: 'bg-gradient-to-br from-purple-900/20 to-pink-900/10',
    border: 'border-purple-700/30 hover:border-purple-600/50',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    titleColor: 'text-purple-100',
    glowColor: 'from-purple-500/20 to-pink-500/20',
    accentBar: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
};

export function InsightCard({ insight }: { insight: Insight }) {
  const styles = variantStyles[insight.type];

  const CardContent = (
    <>
      {/* Glow Effect */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${styles.glowColor} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex gap-4">
        {/* Icon Container */}
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} transition-transform duration-300 group-hover:scale-110`}>
          <span className={`text-2xl ${styles.iconColor}`}>
            {insight.icon}
          </span>
        </div>

        {/* Text Content */}
        <div className="flex-1 space-y-1">
          <h3 className={`font-semibold ${styles.titleColor} transition-colors`}>
            {insight.title}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {insight.description}
          </p>

          {/* Action Button */}
          {insight.action && (
            <button className={`mt-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${styles.iconColor} ${styles.iconBg} transition-all hover:brightness-125`}>
              {insight.action.label}
              <span className="text-xs">→</span>
            </button>
          )}
        </div>
      </div>

      {/* Accent Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-0.5 ${styles.accentBar} opacity-50 transition-all duration-300 group-hover:h-1 group-hover:opacity-100`}
        aria-hidden="true"
      />

      {/* Top Right Corner Accent */}
      <div className={`absolute right-0 top-0 h-8 w-8 ${styles.accentBar} opacity-20 blur-xl transition-opacity group-hover:opacity-40`} />
    </>
  );

  if (insight.action) {
    return (
      <Link href={insight.action.href}>
        <div className={`group relative overflow-hidden rounded-lg border ${styles.border} ${styles.background} p-4 backdrop-blur-sm transition-all duration-300 hover:shadow-lg`}>
          {CardContent}
        </div>
      </Link>
    );
  }

  return (
    <div className={`group relative overflow-hidden rounded-lg border ${styles.border} ${styles.background} p-4 backdrop-blur-sm transition-all duration-300`}>
      {CardContent}
    </div>
  );
}
