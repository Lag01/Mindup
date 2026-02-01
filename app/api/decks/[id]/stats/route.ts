import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id: deckId } = await context.params;

    // Verify deck belongs to user and get learning method
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      select: {
        id: true,
        learningMethod: true,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Optimisation : requête SQL agrégée au lieu de charger toutes les cartes
    // Cela élimine les boucles forEach et réduit drastiquement la charge mémoire
    const [mainStats] = await prisma.$queryRaw<Array<{
      totalCards: bigint;
      notStarted: bigint;
      inProgress: bigint;
      reviewed: bigint;
      totalReviews: bigint;
      againCount: bigint;
      hardCount: bigint;
      goodCount: bigint;
      easyCount: bigint;
      difficultCards: bigint;
      masteredCards: bigint;
      reviewsToday: bigint;
      reviewsThisWeek: bigint;
      ankiNew: bigint;
      ankiLearning: bigint;
      ankiReview: bigint;
      ankiDueToday: bigint;
      avgInterval: number | null;
    }>>`
      SELECT
        COUNT(*) as "totalCards",
        COUNT(CASE WHEN r.reps IS NULL OR r.reps = 0 THEN 1 END) as "notStarted",
        COUNT(CASE WHEN r.reps > 0 THEN 1 END) as "inProgress",
        COUNT(CASE WHEN r.reps > 0 THEN 1 END) as "reviewed",
        COALESCE(SUM(r.reps), 0) as "totalReviews",
        COALESCE(SUM(r."againCount"), 0) as "againCount",
        COALESCE(SUM(r."hardCount"), 0) as "hardCount",
        COALESCE(SUM(r."goodCount"), 0) as "goodCount",
        COALESCE(SUM(r."easyCount"), 0) as "easyCount",
        COUNT(CASE
          WHEN r.reps > 0 AND (r."againCount" + r."hardCount")::float / r.reps > 0.5
          THEN 1
        END) as "difficultCards",
        COUNT(CASE
          WHEN r.reps > 0 AND r."easyCount"::float / r.reps > 0.7
          THEN 1
        END) as "masteredCards",
        COUNT(CASE WHEN r."lastReview" >= ${today} THEN 1 END) as "reviewsToday",
        COUNT(CASE WHEN r."lastReview" >= ${weekAgo} THEN 1 END) as "reviewsThisWeek",

        -- Stats ANKI
        COUNT(CASE WHEN r."status" = 'NEW' THEN 1 END) as "ankiNew",
        COUNT(CASE WHEN r."status" = 'LEARNING' THEN 1 END) as "ankiLearning",
        COUNT(CASE WHEN r."status" = 'REVIEW' THEN 1 END) as "ankiReview",
        COUNT(CASE WHEN r."nextReview" <= CURRENT_DATE THEN 1 END) as "ankiDueToday",
        AVG(r."interval") as "avgInterval"
      FROM "Card" c
      LEFT JOIN "Review" r ON r."cardId" = c.id AND r."userId" = ${user.id}
      WHERE c."deckId" = ${deckId}
    `;

    // Requête pour l'historique des 7 derniers jours
    const reviewHistoryRaw = await prisma.$queryRaw<Array<{
      date: Date;
      count: bigint;
    }>>`
      SELECT
        DATE(r."lastReview") as "date",
        COUNT(*) as "count"
      FROM "Card" c
      INNER JOIN "Review" r ON r."cardId" = c.id AND r."userId" = ${user.id}
      WHERE c."deckId" = ${deckId}
        AND r."lastReview" >= ${weekAgo}
      GROUP BY DATE(r."lastReview")
      ORDER BY "date" ASC
    `;

    // Construire l'historique complet avec les jours à 0
    const historyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      historyMap.set(dateStr, 0);
    }

    // Remplir avec les vraies valeurs
    reviewHistoryRaw.forEach(row => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      if (historyMap.has(dateStr)) {
        historyMap.set(dateStr, Number(row.count));
      }
    });

    const reviewHistory = Array.from(historyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Calculer le taux de succès
    const totalReviews = Number(mainStats.totalReviews);
    const totalSuccesses = Number(mainStats.goodCount) + Number(mainStats.easyCount);
    const successRate = totalReviews > 0 ? (totalSuccesses / totalReviews) * 100 : 0;

    // 1. Temps moyen par carte (basé sur ReviewEvents)
    const avgTimeResult = await prisma.$queryRaw<Array<{ avgTimePerCard: number | null }>>`
      SELECT AVG(time_diff) as "avgTimePerCard"
      FROM (
        SELECT EXTRACT(EPOCH FROM (
          LEAD(re."createdAt") OVER (PARTITION BY re."cardId" ORDER BY re."createdAt") - re."createdAt"
        )) as time_diff
        FROM "ReviewEvent" re
        INNER JOIN "Card" c ON c.id = re."cardId"
        WHERE c."deckId" = ${deckId} AND re."userId" = ${user.id}
      ) time_diffs
      WHERE time_diff IS NOT NULL AND time_diff BETWEEN 1 AND 300
    `;
    const avgTimePerCard = avgTimeResult[0]?.avgTimePerCard ?? 0;

    // 2. Top 5 cartes difficiles
    const topDifficultCards = await prisma.$queryRaw<Array<{
      cardId: string;
      front: string;
      againCount: bigint;
      hardCount: bigint;
      reps: bigint;
      failureRate: number;
    }>>`
      SELECT
        c.id as "cardId",
        c.front,
        r."againCount",
        r."hardCount",
        r.reps,
        (r."againCount" + r."hardCount")::float / NULLIF(r.reps, 0) as "failureRate"
      FROM "Card" c
      INNER JOIN "Review" r ON r."cardId" = c.id
      WHERE c."deckId" = ${deckId} AND r."userId" = ${user.id} AND r.reps >= 3
      ORDER BY "failureRate" DESC
      LIMIT 5
    `;

    // 3. Comparaison période précédente
    const reviewComparison = await prisma.$queryRaw<Array<{
      reviewsToday: bigint;
      reviewsYesterday: bigint;
      reviewsThisWeek: bigint;
      reviewsPreviousWeek: bigint;
      successRateThisWeek: number | null;
      successRatePreviousWeek: number | null;
    }>>`
      SELECT
        COUNT(CASE WHEN r."lastReview" >= ${today} THEN 1 END) as "reviewsToday",
        COUNT(CASE WHEN r."lastReview" >= ${yesterday} AND r."lastReview" < ${today} THEN 1 END) as "reviewsYesterday",
        COUNT(CASE WHEN r."lastReview" >= ${weekAgo} THEN 1 END) as "reviewsThisWeek",
        COUNT(CASE WHEN r."lastReview" >= ${twoWeeksAgo} AND r."lastReview" < ${weekAgo} THEN 1 END) as "reviewsPreviousWeek",

        CASE
          WHEN SUM(CASE WHEN r."lastReview" >= ${weekAgo} THEN r.reps ELSE 0 END) > 0
          THEN (SUM(CASE WHEN r."lastReview" >= ${weekAgo} THEN r."goodCount" + r."easyCount" ELSE 0 END)::float /
                SUM(CASE WHEN r."lastReview" >= ${weekAgo} THEN r.reps ELSE 0 END)) * 100
          ELSE NULL
        END as "successRateThisWeek",

        CASE
          WHEN SUM(CASE WHEN r."lastReview" >= ${twoWeeksAgo} AND r."lastReview" < ${weekAgo} THEN r.reps ELSE 0 END) > 0
          THEN (SUM(CASE WHEN r."lastReview" >= ${twoWeeksAgo} AND r."lastReview" < ${weekAgo} THEN r."goodCount" + r."easyCount" ELSE 0 END)::float /
                SUM(CASE WHEN r."lastReview" >= ${twoWeeksAgo} AND r."lastReview" < ${weekAgo} THEN r.reps ELSE 0 END)) * 100
          ELSE NULL
        END as "successRatePreviousWeek"
      FROM "Card" c
      LEFT JOIN "Review" r ON r."cardId" = c.id AND r."userId" = ${user.id}
      WHERE c."deckId" = ${deckId}
    `;

    const comparison = reviewComparison[0];
    const reviewsTodayNum = Number(comparison?.reviewsToday ?? 0);
    const reviewsYesterdayNum = Number(comparison?.reviewsYesterday ?? 0);
    const reviewsThisWeekNum = Number(comparison?.reviewsThisWeek ?? 0);
    const reviewsPreviousWeekNum = Number(comparison?.reviewsPreviousWeek ?? 0);

    const reviewsVsYesterday = reviewsYesterdayNum > 0
      ? ((reviewsTodayNum - reviewsYesterdayNum) / reviewsYesterdayNum) * 100
      : 0;
    const reviewsVsPreviousWeek = reviewsPreviousWeekNum > 0
      ? ((reviewsThisWeekNum - reviewsPreviousWeekNum) / reviewsPreviousWeekNum) * 100
      : 0;

    const successRateThisWeek = comparison?.successRateThisWeek ?? 0;
    const successRatePreviousWeek = comparison?.successRatePreviousWeek ?? 0;
    const successRateChange = successRatePreviousWeek > 0
      ? successRateThisWeek - successRatePreviousWeek
      : 0;

    // 4. Dernières cartes maîtrisées
    const recentlyMastered = await prisma.$queryRaw<Array<{
      cardId: string;
      front: string;
      masteredAt: Date;
    }>>`
      SELECT c.id as "cardId", c.front, r."lastReview" as "masteredAt"
      FROM "Card" c
      INNER JOIN "Review" r ON r."cardId" = c.id
      WHERE c."deckId" = ${deckId}
        AND r."userId" = ${user.id}
        AND r.reps > 0
        AND r."easyCount"::float / NULLIF(r.reps, 0) > 0.7
      ORDER BY r."lastReview" DESC
      LIMIT 5
    `;

    // 5. Prédictions
    const totalCards = Number(mainStats.totalCards);
    const masteredCards = Number(mainStats.masteredCards);
    const remainingCards = totalCards - masteredCards;

    // Calcul de la moyenne de cartes maîtrisées par jour (30 derniers jours)
    const masteryRateResult = await prisma.$queryRaw<Array<{ avgMasteredPerDay: number | null }>>`
      SELECT COUNT(*)::float / 30 as "avgMasteredPerDay"
      FROM "Card" c
      INNER JOIN "Review" r ON r."cardId" = c.id
      WHERE c."deckId" = ${deckId}
        AND r."userId" = ${user.id}
        AND r."lastReview" >= ${monthAgo}
        AND r."easyCount"::float / NULLIF(r.reps, 0) > 0.7
    `;
    const avgMasteredPerDay = masteryRateResult[0]?.avgMasteredPerDay ?? 0;

    const estimatedCompletionDays = avgMasteredPerDay > 0
      ? Math.ceil(remainingCards / avgMasteredPerDay)
      : 0;

    const projectedMasteryRate = totalCards > 0 && avgMasteredPerDay > 0
      ? Math.min(100, ((masteredCards + (avgMasteredPerDay * 30)) / totalCards) * 100)
      : 0;

    // Temps total d'étude (estimation basée sur ReviewEvents)
    const totalStudyTimeResult = await prisma.$queryRaw<Array<{ totalMinutes: number | null }>>`
      SELECT SUM(time_diff) / 60 as "totalMinutes"
      FROM (
        SELECT EXTRACT(EPOCH FROM (
          LEAD(re."createdAt") OVER (PARTITION BY re."cardId" ORDER BY re."createdAt") - re."createdAt"
        )) as time_diff
        FROM "ReviewEvent" re
        INNER JOIN "Card" c ON c.id = re."cardId"
        WHERE c."deckId" = ${deckId} AND re."userId" = ${user.id}
      ) time_diffs
      WHERE time_diff IS NOT NULL AND time_diff BETWEEN 1 AND 300
    `;
    const totalStudyTime = Math.round(totalStudyTimeResult[0]?.totalMinutes ?? 0);

    // Construire l'objet stats final
    const stats = {
      totalCards: Number(mainStats.totalCards),
      cardsByStatus: {
        notStarted: Number(mainStats.notStarted),
        inProgress: Number(mainStats.inProgress),
        reviewed: Number(mainStats.reviewed),
      },
      totalReviews,
      successRate,
      ratingDistribution: {
        again: Number(mainStats.againCount),
        hard: Number(mainStats.hardCount),
        good: Number(mainStats.goodCount),
        easy: Number(mainStats.easyCount),
      },
      difficultCards: Number(mainStats.difficultCards),
      masteredCards: Number(mainStats.masteredCards),
      reviewsToday: Number(mainStats.reviewsToday),
      reviewsThisWeek: Number(mainStats.reviewsThisWeek),
      reviewHistory,
      learningMethod: deck.learningMethod,
      // Stats Anki (null si méthode IMMEDIATE)
      ankiStats: deck.learningMethod === 'ANKI' ? {
        new: Number(mainStats.ankiNew),
        learning: Number(mainStats.ankiLearning),
        review: Number(mainStats.ankiReview),
        dueToday: Number(mainStats.ankiDueToday),
        avgInterval: mainStats.avgInterval ? Math.round(mainStats.avgInterval) : 0,
      } : null,

      // Nouvelles métriques enrichies
      avgTimePerCard: Math.round(avgTimePerCard),
      totalStudyTime,
      reviewsVsYesterday: Math.round(reviewsVsYesterday * 10) / 10,
      reviewsVsPreviousWeek: Math.round(reviewsVsPreviousWeek * 10) / 10,
      successRateChange: Math.round(successRateChange * 10) / 10,
      estimatedCompletionDays,
      projectedMasteryRate: Math.round(projectedMasteryRate * 10) / 10,
      topDifficultCards: topDifficultCards.map(card => ({
        cardId: card.cardId,
        front: card.front.substring(0, 100),
        failureRate: Math.round(card.failureRate * 100),
      })),
      recentlyMastered: recentlyMastered.map(card => ({
        cardId: card.cardId,
        front: card.front.substring(0, 100),
        masteredAt: card.masteredAt.toISOString(),
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get deck stats error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
