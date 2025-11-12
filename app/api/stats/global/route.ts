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

    // Get all user's decks with cards and reviews
    const decks = await prisma.deck.findMany({
      where: {
        userId: user.id,
      },
      include: {
        cards: {
          include: {
            reviews: {
              where: {
                userId: user.id,
              },
            },
          },
        },
      },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate global statistics
    const stats = {
      totalDecks: decks.length,
      totalCards: 0,
      dueCards: 0,
      totalReviews: 0,
      reviewsToday: 0,
      masteredCards: 0,
      cardsByState: {
        new: 0,
        learning: 0,
        review: 0,
        relearning: 0,
      },
      successRate: 0,
      streak: 0, // Days of consecutive reviews
    };

    let totalLapses = 0;

    decks.forEach(deck => {
      deck.cards.forEach(card => {
        stats.totalCards++;

        const review = card.reviews[0];
        if (review) {
          // Card states
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

          // Due cards
          if (review.due <= now) {
            stats.dueCards++;
          }

          // Total reviews
          stats.totalReviews += review.reps;
          totalLapses += review.lapses;

          // Mastered cards
          if (review.stability > 100) {
            stats.masteredCards++;
          }

          // Reviews today
          if (review.lastReview) {
            const lastReviewDate = new Date(review.lastReview);
            if (lastReviewDate >= today) {
              stats.reviewsToday++;
            }
          }
        }
      });
    });

    // Calculate success rate
    if (stats.totalReviews > 0) {
      stats.successRate = ((stats.totalReviews - totalLapses) / stats.totalReviews) * 100;
    }

    // Calculate streak
    stats.streak = await calculateStreak(user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get global stats error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}

async function calculateStreak(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  // Go back day by day and check if there were reviews
  while (true) {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const reviewsOnDay = await prisma.review.count({
      where: {
        userId: userId,
        lastReview: {
          gte: currentDate,
          lt: nextDay,
        },
      },
    });

    if (reviewsOnDay > 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // If today has no reviews, don't count it as breaking the streak
      if (currentDate.getTime() === today.getTime()) {
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }
      break;
    }

    // Limit to prevent infinite loop (max 365 days)
    if (streak >= 365) break;
  }

  return streak;
}
