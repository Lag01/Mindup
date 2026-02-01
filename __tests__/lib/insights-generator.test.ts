import { generateInsights } from '@/lib/insights-generator';

describe('generateInsights', () => {
  const mockStats = {
    totalCards: 100,
    masteredCards: 50,
    difficultCards: 10,
    reviewsToday: 20,
    reviewsVsYesterday: 15,
    successRate: 75,
    successRateChange: 12,
    topDifficultCards: [
      { cardId: '1', front: 'Test card 1', failureRate: 70 },
      { cardId: '2', front: 'Test card 2', failureRate: 65 },
      { cardId: '3', front: 'Test card 3', failureRate: 60 },
    ],
    estimatedCompletionDays: 20,
    reviewsVsPreviousWeek: 10,
    totalReviews: 500,
  };

  it('should generate warning for difficult cards', () => {
    const insights = generateInsights(mockStats, 'deck-123');
    const difficultWarning = insights.find(i => i.type === 'warning' && i.title.includes('cartes nécessitent attention'));

    expect(difficultWarning).toBeDefined();
    expect(difficultWarning?.priority).toBe(5);
    expect(difficultWarning?.action).toBeDefined();
  });

  it('should generate positive insight for high success rate change', () => {
    const insights = generateInsights(mockStats, 'deck-123');
    const positiveInsight = insights.find(i => i.type === 'positive' && i.title.includes('Progression excellente'));

    expect(positiveInsight).toBeDefined();
    expect(positiveInsight?.priority).toBe(4);
  });

  it('should generate milestone for mastered deck', () => {
    const masteredStats = {
      ...mockStats,
      masteredCards: 100,
    };

    const insights = generateInsights(masteredStats, 'deck-123');
    const milestone = insights.find(i => i.type === 'milestone' && i.title.includes('maîtrisé'));

    expect(milestone).toBeDefined();
    expect(milestone?.priority).toBe(5);
  });

  it('should generate warning for streak danger after 18h', () => {
    const statsNoReviews = {
      ...mockStats,
      reviewsToday: 0,
    };

    const insights = generateInsights(statsNoReviews, 'deck-123', 20); // 20h
    const streakWarning = insights.find(i => i.type === 'warning' && i.title.includes('Streak en danger'));

    expect(streakWarning).toBeDefined();
    expect(streakWarning?.priority).toBe(5);
  });

  it('should limit insights to top 5 by priority', () => {
    const insights = generateInsights(mockStats, 'deck-123');

    expect(insights.length).toBeLessThanOrEqual(5);
  });

  it('should sort insights by priority descending', () => {
    const insights = generateInsights(mockStats, 'deck-123');

    for (let i = 0; i < insights.length - 1; i++) {
      expect(insights[i].priority).toBeGreaterThanOrEqual(insights[i + 1].priority);
    }
  });
});
