import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Requête 1 : Compter les decks
    const totalDecks = await prisma.deck.count({
      where: { userId: user.id },
    });

    // Requête 2 : Stats agrégées sur les reviews avec une seule requête SQL
    const reviewStats = await prisma.$queryRaw<Array<{
      total_cards: bigint;
      not_started: bigint;
      in_progress: bigint;
      total_reviews: bigint;
      again_count: bigint;
      hard_count: bigint;
      good_count: bigint;
      easy_count: bigint;
      mastered_cards: bigint;
      difficult_cards: bigint;
    }>>`
      SELECT
        COUNT(DISTINCT c.id) as total_cards,
        COUNT(DISTINCT c.id) FILTER (WHERE r.id IS NULL OR r.reps = 0) as not_started,
        COUNT(DISTINCT c.id) FILTER (WHERE r.id IS NOT NULL AND r.reps > 0) as in_progress,
        COALESCE(SUM(r.reps), 0) as total_reviews,
        COALESCE(SUM(r."againCount"), 0) as again_count,
        COALESCE(SUM(r."hardCount"), 0) as hard_count,
        COALESCE(SUM(r."goodCount"), 0) as good_count,
        COALESCE(SUM(r."easyCount"), 0) as easy_count,
        COUNT(DISTINCT c.id) FILTER (
          WHERE r.reps > 0 AND (r."easyCount"::float / r.reps) > 0.7
        ) as mastered_cards,
        COUNT(DISTINCT c.id) FILTER (
          WHERE r.reps > 0 AND ((r."againCount" + r."hardCount")::float / r.reps) > 0.5
        ) as difficult_cards
      FROM "Card" c
      INNER JOIN "Deck" d ON c."deckId" = d.id
      LEFT JOIN "Review" r ON c.id = r."cardId" AND r."userId" = ${user.id}
      WHERE d."userId" = ${user.id}
    `;

    const stats = reviewStats[0];

    // Requête 3 : Compter les reviews d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reviewsToday = await prisma.review.count({
      where: {
        userId: user.id,
        lastReview: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Requête 4 : Calculer le streak de manière optimisée
    const streak = await calculateStreakOptimized(user.id);

    // Convertir BigInt en Number et calculer le taux de succès
    const totalReviews = Number(stats.total_reviews);
    const goodCount = Number(stats.good_count);
    const easyCount = Number(stats.easy_count);
    const successRate = totalReviews > 0
      ? ((goodCount + easyCount) / totalReviews) * 100
      : 0;

    return NextResponse.json({
      totalDecks,
      totalCards: Number(stats.total_cards),
      notStarted: Number(stats.not_started),
      inProgress: Number(stats.in_progress),
      totalReviews,
      reviewsToday,
      masteredCards: Number(stats.mastered_cards),
      difficultCards: Number(stats.difficult_cards),
      ratingDistribution: {
        again: Number(stats.again_count),
        hard: Number(stats.hard_count),
        good: Number(stats.good_count),
        easy: Number(stats.easy_count),
      },
      successRate,
      streak,
    });
  } catch (error) {
    console.error('Get global stats error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}

/**
 * Calcule le streak de l'utilisateur de manière optimisée
 * Utilise ReviewEvent au lieu de Review pour plus de précision
 */
async function calculateStreakOptimized(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Récupérer les 365 derniers jours de reviews en une seule requête
  const oneYearAgo = new Date(today);
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  const reviewDates = await prisma.$queryRaw<Array<{ review_date: Date }>>`
    SELECT DISTINCT DATE("createdAt") as review_date
    FROM "ReviewEvent"
    WHERE "userId" = ${userId}
      AND "createdAt" >= ${oneYearAgo}
      AND "createdAt" < ${today.toISOString()}
    ORDER BY review_date DESC
  `;

  if (reviewDates.length === 0) {
    return 0;
  }

  // Calculer le streak en mémoire (efficace car max 365 dates)
  let streak = 0;
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() - 1); // Commencer hier
  currentDate.setHours(0, 0, 0, 0);

  const dateSet = new Set(
    reviewDates.map(d => new Date(d.review_date).toISOString().split('T')[0])
  );

  // Vérifier les jours consécutifs
  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];

    if (dateSet.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
