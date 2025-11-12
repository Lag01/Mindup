import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
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

    const { id: deckId } = context.params;

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

      // États des cartes
      cardsByState: {
        new: 0,
        learning: 0,
        review: 0,
        relearning: 0,
      },

      // Cartes dues
      dueCards: 0,

      // Performance
      totalReviews: 0,
      averageDifficulty: 0,
      masteredCards: 0, // stability > 100
      difficultCards: 0, // difficulty > 8

      // Activité récente
      reviewsToday: 0,
      reviewsThisWeek: 0,

      // Taux de réussite (basé sur les lapses)
      successRate: 0,

      // Historique des révisions par jour (7 derniers jours)
      reviewHistory: [] as { date: string; count: number }[],
    };

    let totalDifficulty = 0;
    let cardsWithReviews = 0;

    cards.forEach(card => {
      const review = card.reviews[0];

      if (review) {
        // États des cartes
        switch (review.state) {
          case 0:
            stats.cardsByState.new++;
            break;
          case 1:
            stats.cardsByState.learning++;
            break;
          case 2:
            stats.cardsByState.review++;
            break;
          case 3:
            stats.cardsByState.relearning++;
            break;
        }

        // Cartes dues
        if (review.due <= now) {
          stats.dueCards++;
        }

        // Performance
        stats.totalReviews += review.reps;
        totalDifficulty += review.difficulty;
        cardsWithReviews++;

        if (review.stability > 100) {
          stats.masteredCards++;
        }

        if (review.difficulty > 8) {
          stats.difficultCards++;
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
      }
    });

    // Calculate average difficulty
    if (cardsWithReviews > 0) {
      stats.averageDifficulty = totalDifficulty / cardsWithReviews;
    }

    // Calculate success rate
    const totalLapses = cards.reduce((sum, card) => {
      return sum + (card.reviews[0]?.lapses || 0);
    }, 0);

    if (stats.totalReviews > 0) {
      stats.successRate = ((stats.totalReviews - totalLapses) / stats.totalReviews) * 100;
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
