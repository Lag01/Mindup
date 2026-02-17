import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { updateReviewStats, Rating } from '@/lib/revision';
import { updateAnkiReviewStats, AnkiRating, CardStatus } from '@/lib/anki';
import { updateUserStreak } from '@/lib/streak';

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

    // Get cards from the deck
    // For ANKI method: filter by cards due (nextReview <= today OR never reviewed)
    // For IMMEDIATE method: get all cards
    let cards;

    if (deck.learningMethod === 'ANKI') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Requête SQL directe avec LEFT JOIN pour filtrer en SQL (pas en JS)
      const rawCards = await prisma.$queryRaw<Array<{
        id: string;
        front: string;
        back: string;
        frontType: string;
        backType: string;
        frontImage: string | null;
        backImage: string | null;
        order: number;
        reviewId: string | null;
        reps: number | null;
        againCount: number | null;
        hardCount: number | null;
        goodCount: number | null;
        easyCount: number | null;
        lastReview: Date | null;
        interval: number | null;
        nextReview: Date | null;
        easeFactor: number | null;
        status: string | null;
      }>>`
        SELECT
          c.id, c.front, c.back,
          c."frontType", c."backType",
          c."frontImage", c."backImage",
          c."order",
          r.id AS "reviewId",
          r.reps, r."againCount", r."hardCount", r."goodCount", r."easyCount",
          r."lastReview", r.interval, r."nextReview", r."easeFactor", r.status
        FROM "Card" c
        LEFT JOIN "Review" r ON r."cardId" = c.id AND r."userId" = ${user.id}
        WHERE c."deckId" = ${deckId}
          AND (r.id IS NULL OR r."nextReview" IS NULL OR r."nextReview" <= ${today})
        ORDER BY c."order" ASC
      `;

      cards = rawCards.map(row => ({
        id: row.id,
        front: row.front,
        back: row.back,
        frontType: row.frontType,
        backType: row.backType,
        frontImage: row.frontImage,
        backImage: row.backImage,
        reviews: row.reviewId ? [{
          id: row.reviewId,
          reps: row.reps,
          againCount: row.againCount,
          hardCount: row.hardCount,
          goodCount: row.goodCount,
          easyCount: row.easyCount,
          lastReview: row.lastReview,
          interval: row.interval,
          nextReview: row.nextReview,
          easeFactor: row.easeFactor,
          status: row.status,
        }] : [],
      }));
    } else {
      // IMMEDIATE method: Get ALL cards (not filtered by due date)
      cards = await prisma.card.findMany({
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
    }

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
      learningMethod: deck.learningMethod,
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

    // Determine which algorithm to use based on deck's learning method
    const learningMethod = currentReview.card.deck.learningMethod;

    // Utiliser une transaction pour garantir la cohérence des données
    await prisma.$transaction(async (tx) => {
      if (learningMethod === 'ANKI') {
        // Use Anki algorithm
        const ankiStats = updateAnkiReviewStats(
          {
            reps: currentReview.reps,
            againCount: currentReview.againCount,
            hardCount: currentReview.hardCount,
            goodCount: currentReview.goodCount,
            easyCount: currentReview.easyCount,
            lastReview: currentReview.lastReview,
            interval: currentReview.interval,
            nextReview: currentReview.nextReview,
            easeFactor: currentReview.easeFactor,
            status: (currentReview.status as CardStatus) || 'NEW',
          },
          rating as AnkiRating
        );

        // Update review with Anki-specific fields
        await tx.review.update({
          where: {
            cardId_userId: {
              cardId,
              userId: user.id,
            },
          },
          data: {
            reps: ankiStats.reps,
            againCount: ankiStats.againCount,
            hardCount: ankiStats.hardCount,
            goodCount: ankiStats.goodCount,
            easyCount: ankiStats.easyCount,
            lastReview: ankiStats.lastReview,
            interval: ankiStats.interval,
            nextReview: ankiStats.nextReview,
            easeFactor: ankiStats.easeFactor,
            status: ankiStats.status,
          },
        });
      } else {
        // Use IMMEDIATE algorithm (current behavior)
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
        await tx.review.update({
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
      }

      // Common code for both methods
      const updatedReview = await tx.review.findUnique({
        where: {
          cardId_userId: {
            cardId,
            userId: user.id,
          },
        },
      });

      if (!updatedReview) {
        throw new Error('Review not found after update');
      }

      // Créer un événement de révision pour le tracking du leaderboard
      await tx.reviewEvent.create({
        data: {
          reviewId: updatedReview.id,
          userId: user.id,
          cardId,
          rating: rating as Rating,
        },
      });

      // Increment user's reviewed cards counter
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          reviewedCardsCount: {
            increment: 1,
          },
        },
      });
    });

    // Mettre à jour le streak de l'utilisateur après la révision
    try {
      await updateUserStreak(user.id);
    } catch (streakError) {
      console.error('Erreur lors de la mise à jour du streak:', streakError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit review error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la soumission de la révision' },
      { status: 500 }
    );
  }
}
