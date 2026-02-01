export interface TrendData {
  value: number;
  percentage: number;
  direction: 'up' | 'down' | 'stable';
}

export function calculateTrend(current: number, previous: number): TrendData {
  if (previous === 0) {
    return {
      value: current,
      percentage: 0,
      direction: 'stable',
    };
  }

  const change = current - previous;
  const percentage = (change / previous) * 100;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (percentage > 5) direction = 'up';
  else if (percentage < -5) direction = 'down';

  return {
    value: Math.round(change * 10) / 10,
    percentage: Math.round(percentage * 10) / 10,
    direction,
  };
}

export function generateSparkline(data: number[], maxPoints: number = 7): number[] {
  if (data.length === 0) return [];
  if (data.length <= maxPoints) return data;

  // Échantillonnage uniforme
  const step = data.length / maxPoints;
  const result: number[] = [];

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.floor(i * step);
    result.push(data[index]);
  }

  return result;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

export function estimateCompletionDays(
  masteredCards: number,
  totalCards: number,
  avgMasteredPerDay: number
): number {
  if (totalCards === 0 || avgMasteredPerDay === 0) {
    return 0;
  }

  const remainingCards = totalCards - masteredCards;
  if (remainingCards <= 0) {
    return 0;
  }

  return Math.ceil(remainingCards / avgMasteredPerDay);
}

export function calculateProjectedMastery(
  currentMastered: number,
  totalCards: number,
  avgMasteredPerDay: number,
  daysAhead: number = 30
): number {
  if (totalCards === 0) return 0;

  const projectedMastered = Math.min(
    totalCards,
    currentMastered + (avgMasteredPerDay * daysAhead)
  );

  return (projectedMastered / totalCards) * 100;
}

export function getSuccessRateColor(rate: number): string {
  if (rate >= 80) return 'from-green-500 to-emerald-600';
  if (rate >= 60) return 'from-blue-500 to-cyan-600';
  if (rate >= 40) return 'from-yellow-500 to-orange-600';
  return 'from-orange-500 to-red-600';
}

export function getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
  switch (direction) {
    case 'up': return '↑';
    case 'down': return '↓';
    case 'stable': return '→';
  }
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}
