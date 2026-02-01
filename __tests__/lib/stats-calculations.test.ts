import {
  calculateTrend,
  generateSparkline,
  formatDuration,
  estimateCompletionDays,
  calculateProjectedMastery,
  getSuccessRateColor,
  getTrendIcon,
} from '@/lib/stats-calculations';

describe('calculateTrend', () => {
  it('should calculate positive trend', () => {
    const result = calculateTrend(120, 100);

    expect(result.value).toBe(20);
    expect(result.percentage).toBe(20);
    expect(result.direction).toBe('up');
  });

  it('should calculate negative trend', () => {
    const result = calculateTrend(80, 100);

    expect(result.value).toBe(-20);
    expect(result.percentage).toBe(-20);
    expect(result.direction).toBe('down');
  });

  it('should handle stable trend', () => {
    const result = calculateTrend(100, 100);

    expect(result.percentage).toBe(0);
    expect(result.direction).toBe('stable');
  });

  it('should handle zero previous value', () => {
    const result = calculateTrend(50, 0);

    expect(result.value).toBe(50);
    expect(result.percentage).toBe(0);
    expect(result.direction).toBe('stable');
  });
});

describe('generateSparkline', () => {
  it('should return original array if shorter than maxPoints', () => {
    const data = [1, 2, 3, 4, 5];
    const result = generateSparkline(data);

    expect(result).toEqual(data);
  });

  it('should sample array to maxPoints', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = generateSparkline(data, 5);

    expect(result.length).toBe(5);
  });

  it('should handle empty array', () => {
    const result = generateSparkline([]);

    expect(result).toEqual([]);
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('should format minutes', () => {
    expect(formatDuration(120)).toBe('2m');
    expect(formatDuration(150)).toBe('2m 30s');
  });

  it('should format hours', () => {
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(3720)).toBe('1h 2m');
  });
});

describe('estimateCompletionDays', () => {
  it('should calculate days correctly', () => {
    const result = estimateCompletionDays(50, 100, 5);

    expect(result).toBe(10); // (100-50)/5 = 10
  });

  it('should return 0 if already mastered', () => {
    const result = estimateCompletionDays(100, 100, 5);

    expect(result).toBe(0);
  });

  it('should return 0 if no progress rate', () => {
    const result = estimateCompletionDays(50, 100, 0);

    expect(result).toBe(0);
  });
});

describe('calculateProjectedMastery', () => {
  it('should project mastery correctly', () => {
    const result = calculateProjectedMastery(50, 100, 2, 10);

    expect(result).toBe(70); // (50 + 2*10) / 100 * 100
  });

  it('should cap at 100%', () => {
    const result = calculateProjectedMastery(50, 100, 10, 10);

    expect(result).toBe(100);
  });

  it('should return 0 for empty deck', () => {
    const result = calculateProjectedMastery(0, 0, 5, 30);

    expect(result).toBe(0);
  });
});

describe('getSuccessRateColor', () => {
  it('should return green gradient for high rate', () => {
    expect(getSuccessRateColor(85)).toBe('from-green-500 to-emerald-600');
  });

  it('should return blue gradient for medium rate', () => {
    expect(getSuccessRateColor(65)).toBe('from-blue-500 to-cyan-600');
  });

  it('should return yellow gradient for low-medium rate', () => {
    expect(getSuccessRateColor(45)).toBe('from-yellow-500 to-orange-600');
  });

  it('should return red gradient for low rate', () => {
    expect(getSuccessRateColor(30)).toBe('from-orange-500 to-red-600');
  });
});

describe('getTrendIcon', () => {
  it('should return correct icons', () => {
    expect(getTrendIcon('up')).toBe('↑');
    expect(getTrendIcon('down')).toBe('↓');
    expect(getTrendIcon('stable')).toBe('→');
  });
});
