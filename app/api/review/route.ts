import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { updateReviewStats, Rating } from '@/lib/revision';

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

    // Get ALL cards from the deck (not filtered by due date)
    const cards = await prisma.card.findMany({
      where: {
        deckId: deckId,
      },
      include: {
        reviews: {
          where: {
            userId: user.id,
          },
          take: 1,
        },
      },
      orderBy: {
        order: 'asc', // Keep the original card order
      },
    });

    return NextResponse.json({
      cards: cards.map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
        frontType: card.frontType,
        backType: card.backType,
        frontImage: card.frontImage,
        backImage: card.backImage,
        review: card.reviews[0] || null,
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

    // Get or create review
    let currentReview = await prisma.review.findUnique({
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

    // If no review exists, create one
    if (!currentReview) {
      // Verify card exists and belongs to user's deck
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: { deck: true },
      });

      if (!card || card.deck.userId !== user.id) {
        return NextResponse.json(
          { error: 'Carte non trouvée ou accès non autorisé' },
          { status: 404 }
        );
      }

      currentReview = await prisma.review.create({
        data: {
          cardId,
          userId: user.id,
          reps: 0,
          againCount: 0,
          hardCount: 0,
          goodCount: 0,
          easyCount: 0,
        },
        include: {
          card: {
            include: {
              deck: true,
            },
          },
        },
      });
    }

    // Verify deck belongs to user
    if (currentReview.card.deck.userId !== user.id) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Calculate new review stats
    const newStats = updateReviewStats(
      {
        reps: currentReview.reps,
        againCount: currentReview.againCount,
        hardCount: currentReview.hardCount,
        goodCount: currentReview.goodCount,
        easyCount: currentReview.easyCount,
        lastReview: currentReview.lastReview,
      },
      rating as Rating
    );

    // Update review in database
    await prisma.review.update({
      where: {
        cardId_userId: {
          cardId,
          userId: user.id,
        },
      },
      data: {
        reps: newStats.reps,
        againCount: newStats.againCount,
        hardCount: newStats.hardCount,
        goodCount: newStats.goodCount,
        easyCount: newStats.easyCount,
        lastReview: newStats.lastReview,
      },
    });

    // Increment user's reviewed cards counter
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        reviewedCardsCount: {
          increment: 1,
        },
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
