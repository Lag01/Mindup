'use client';

import { useEffect, useState } from 'react';

interface ProgressRingProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  sublabel?: string;
  gradient?: string;
}

const sizeMap = {
  sm: { dimension: 80, stroke: 6, fontSize: 'text-lg' },
  md: { dimension: 140, stroke: 8, fontSize: 'text-2xl' },
  lg: { dimension: 200, stroke: 10, fontSize: 'text-4xl' },
};

export function ProgressRing({
  percentage,
  size = 'md',
  label,
  sublabel,
  gradient = 'from-cyan-500 to-blue-600',
}: ProgressRingProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const { dimension, stroke, fontSize } = sizeMap[size];

  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPercentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  // Gradient colors extraction
  const gradientStart = gradient.includes('cyan') ? '#06b6d4' :
                        gradient.includes('green') ? '#10b981' :
                        gradient.includes('orange') ? '#f97316' :
                        gradient.includes('yellow') ? '#eab308' : '#3b82f6';

  const gradientEnd = gradient.includes('blue') ? '#2563eb' :
                      gradient.includes('emerald') ? '#059669' :
                      gradient.includes('red') ? '#dc2626' :
                      gradient.includes('orange') ? '#ea580c' : '#1d4ed8';

  return (
    <div className="progress-ring group relative inline-flex items-center justify-center">
      {/* Outer Glow Ring */}
      <div
        className="absolute inset-0 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
        style={{
          background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
        }}
        aria-hidden="true"
      />

      {/* SVG Container */}
      <div className="relative transition-transform duration-300 group-hover:scale-105">
        <svg
          width={dimension}
          height={dimension}
          viewBox={`0 0 ${dimension} ${dimension}`}
          className="transform -rotate-90"
        >
          <defs>
            {/* Gradient Definition */}
            <linearGradient id={`progress-gradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientStart} stopOpacity="1" />
              <stop offset="100%" stopColor={gradientEnd} stopOpacity="1" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id={`glow-${size}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Circle */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={stroke}
            opacity="0.3"
          />

          {/* Progress Circle */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={`url(#progress-gradient-${size})`}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            filter={`url(#glow-${size})`}
            className="transition-all duration-1000 ease-out"
            style={{
              transformOrigin: 'center',
            }}
          />

          {/* Inner Accent Circles */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius - stroke - 4}
            fill="none"
            stroke="#3f3f46"
            strokeWidth="1"
            opacity="0.2"
          />
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius - stroke - 8}
            fill="none"
            stroke="#52525b"
            strokeWidth="0.5"
            opacity="0.1"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`${fontSize} bg-gradient-to-br ${gradient} bg-clip-text font-bold tabular-nums text-transparent`}
            style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
          >
            {Math.round(animatedPercentage)}%
          </span>
          {label && (
            <span className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="mt-0.5 text-xs text-zinc-500">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {/* Corner Accents */}
      <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 rounded-br-lg border-b-2 border-r-2 border-cyan-400/40 transition-opacity group-hover:opacity-100 opacity-60" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-3 w-3 rounded-tl-lg border-l-2 border-t-2 border-cyan-400/40 transition-opacity group-hover:opacity-100 opacity-60" />
    </div>
  );
}
