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

    // Verify deck belongs to user
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
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
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

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
        COUNT(CASE WHEN r."lastReview" >= ${weekAgo} THEN 1 END) as "reviewsThisWeek"
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
