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

    // Get all cards with their reviews
    const cards = await prisma.card.findMany({
      where: {
        deckId: deckId,
      },
      include: {
        reviews: {
          where: {
            userId: user.id,
          },
        },
      },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Calculate statistics
    const stats = {
      totalCards: cards.length,

      // Cartes par statut
      cardsByStatus: {
        notStarted: 0,  // Jamais révisées (reps = 0)
        inProgress: 0,  // En cours (reps > 0)
        reviewed: 0,    // Total avec reviews
      },

      // Performance globale
      totalReviews: 0,
      successRate: 0,   // % de "good" et "easy"

      // Répartition des ratings
      ratingDistribution: {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0,
      },

      // Cartes difficiles et faciles
      difficultCards: 0,  // Plus de 50% de "again" ou "hard"
      masteredCards: 0,   // Plus de 70% de "easy"

      // Activité récente
      reviewsToday: 0,
      reviewsThisWeek: 0,

      // Historique des révisions par jour (7 derniers jours)
      reviewHistory: [] as { date: string; count: number }[],
    };

    let cardsWithReviews = 0;

    cards.forEach(card => {
      const review = card.reviews[0];

      if (!review || review.reps === 0) {
        stats.cardsByStatus.notStarted++;
        return;
      }

      cardsWithReviews++;
      stats.cardsByStatus.reviewed++;
      stats.cardsByStatus.inProgress++;

      // Performance
      stats.totalReviews += review.reps;
      stats.ratingDistribution.again += review.againCount;
      stats.ratingDistribution.hard += review.hardCount;
      stats.ratingDistribution.good += review.goodCount;
      stats.ratingDistribution.easy += review.easyCount;

      // Calculer le taux de réussite de cette carte
      const successCount = review.goodCount + review.easyCount;
      const cardSuccessRate = review.reps > 0 ? (successCount / review.reps) * 100 : 0;

      // Cartes difficiles (plus de 50% d'échecs ou difficultés)
      const failureCount = review.againCount + review.hardCount;
      const failureRate = review.reps > 0 ? (failureCount / review.reps) * 100 : 0;
      if (failureRate > 50) {
        stats.difficultCards++;
      }

      // Cartes maîtrisées (plus de 70% de "easy")
      const easyRate = review.reps > 0 ? (review.easyCount / review.reps) * 100 : 0;
      if (easyRate > 70) {
        stats.masteredCards++;
      }

      // Activité récente
      if (review.lastReview) {
        const lastReviewDate = new Date(review.lastReview);
        if (lastReviewDate >= today) {
          stats.reviewsToday++;
        }
        if (lastReviewDate >= weekAgo) {
          stats.reviewsThisWeek++;
        }
      }
    });

    // Calculate global success rate
    const totalSuccesses = stats.ratingDistribution.good + stats.ratingDistribution.easy;
    if (stats.totalReviews > 0) {
      stats.successRate = (totalSuccesses / stats.totalReviews) * 100;
    }

    // Build review history for the last 7 days
    const historyMap = new Map<string, number>();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      historyMap.set(dateStr, 0);
    }

    // Count reviews per day
    cards.forEach(card => {
      const review = card.reviews[0];
      if (review?.lastReview) {
        const reviewDate = new Date(review.lastReview);
        const dateStr = reviewDate.toISOString().split('T')[0];

        if (historyMap.has(dateStr)) {
          historyMap.set(dateStr, historyMap.get(dateStr)! + 1);
        }
      }
    });

    stats.reviewHistory = Array.from(historyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get deck stats error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
