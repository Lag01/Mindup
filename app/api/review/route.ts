import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { reviewCard } from '@/lib/fsrs';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deckId');

    if (!deckId) {
      return NextResponse.json(
        { error: 'ID du deck requis' },
        { status: 400 }
      );
    }

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

    // Get due cards
    const cards = await prisma.card.findMany({
      where: {
        deckId: deckId,
        reviews: {
          some: {
            userId: user.id,
            due: {
              lte: now,
            },
          },
        },
      },
      include: {
        reviews: {
          where: {
            userId: user.id,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json({
      cards: cards.map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
        review: card.reviews[0],
      })),
    });
  } catch (error) {
    console.error('Get review cards error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des cartes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cardId, rating } = body;

    if (!cardId || !rating) {
      return NextResponse.json(
        { error: 'cardId et rating requis' },
        { status: 400 }
      );
    }

    if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
      return NextResponse.json(
        { error: 'Rating invalide' },
        { status: 400 }
      );
    }

    // Get current review
    const currentReview = await prisma.review.findUnique({
      where: {
        cardId_userId: {
          cardId,
          userId: user.id,
        },
      },
      include: {
        card: {
          include: {
            deck: true,
          },
        },
      },
    });

    if (!currentReview) {
      return NextResponse.json(
        { error: 'Révision non trouvée' },
        { status: 404 }
      );
    }

    // Verify deck belongs to user
    if (currentReview.card.deck.userId !== user.id) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Calculate new review data using FSRS
    const reviewData = {
      due: currentReview.due,
      stability: currentReview.stability,
      difficulty: currentReview.difficulty,
      elapsedDays: currentReview.elapsedDays,
      scheduledDays: currentReview.scheduledDays,
      reps: currentReview.reps,
      lapses: currentReview.lapses,
      state: currentReview.state,
      lastReview: currentReview.lastReview,
    };

    const newReviewData = reviewCard(reviewData, rating as any);

    // Update review in database
    await prisma.review.update({
      where: {
        cardId_userId: {
          cardId,
          userId: user.id,
        },
      },
      data: {
        due: newReviewData.due,
        stability: newReviewData.stability,
        difficulty: newReviewData.difficulty,
        elapsedDays: newReviewData.elapsedDays,
        scheduledDays: newReviewData.scheduledDays,
        reps: newReviewData.reps,
        lapses: newReviewData.lapses,
        state: newReviewData.state,
        lastReview: newReviewData.lastReview,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit review error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la soumission de la révision' },
      { status: 500 }
    );
  }
}
