export const chartColors = {
  primary: '#3b82f6',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#71717a',
};

export const chartConfig = {
  margin: { top: 5, right: 5, left: 0, bottom: 5 },

  stroke: {
    width: 2,
    curve: 'monotone' as const,
  },

  grid: {
    stroke: '#27272a',
    strokeDasharray: '3 3',
  },

  axis: {
    stroke: '#52525b',
    fontSize: 12,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },

  tooltip: {
    contentStyle: {
      backgroundColor: '#18181b',
      border: '1px solid #3f3f46',
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      fontSize: '0.875rem',
    },
    labelStyle: {
      color: '#a1a1aa',
      marginBottom: '0.25rem',
    },
    itemStyle: {
      color: '#fafafa',
    },
  },
};

export const sparklineConfig = {
  margin: { top: 2, right: 2, left: 2, bottom: 2 },

  stroke: {
    width: 1.5,
    curve: 'monotone' as const,
  },

  dot: false,

  gradient: {
    from: { stopColor: '#3b82f6', stopOpacity: 0.4 },
    to: { stopColor: '#3b82f6', stopOpacity: 0 },
  },
};

export const distributionChartConfig = {
  margin: { top: 5, right: 20, left: 80, bottom: 5 },

  bar: {
    radius: [0, 4, 4, 0] as [number, number, number, number],
  },

  label: {
    fill: '#a1a1aa',
    fontSize: 12,
  },
};
