import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createNewReviewStats } from '@/lib/revision';
import { syncImportedDecks } from '@/lib/sync-decks';

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
      include: {
        cards: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      deck: {
        id: deck.id,
        name: deck.name,
        cards: deck.cards,
        originalDeckId: deck.originalDeckId,
      },
    });
  } catch (error) {
    console.error('Get deck cards error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des cartes' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const body = await request.json();
    const { front, back, frontType, backType } = body;

    // Validation
    if (!front || !back) {
      return NextResponse.json(
        { error: 'Le recto et le verso sont requis' },
        { status: 400 }
      );
    }

    if (!['TEXT', 'LATEX'].includes(frontType) || !['TEXT', 'LATEX'].includes(backType)) {
      return NextResponse.json(
        { error: 'Type de contenu invalide' },
        { status: 400 }
      );
    }

    // Verify deck belongs to user
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      include: {
        cards: {
          orderBy: {
            order: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    // Bloquer l'ajout de cartes aux decks importés
    if (deck.originalDeckId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas ajouter de cartes à un deck importé. Il est synchronisé avec le deck public.' },
        { status: 403 }
      );
    }

    // Calculate next order number
    const nextOrder = deck.cards.length > 0 ? deck.cards[0].order + 1 : 0;

    // Create card and review in a transaction
    const card = await prisma.$transaction(async (tx) => {
      // Create the card
      const createdCard = await tx.card.create({
        data: {
          deckId: deckId,
          front,
          back,
          frontType,
          backType,
          order: nextOrder,
        },
      });

      // Create initial review for the card
      const newStats = createNewReviewStats();
      await tx.review.create({
        data: {
          cardId: createdCard.id,
          userId: user.id,
          reps: newStats.reps,
          againCount: newStats.againCount,
          hardCount: newStats.hardCount,
          goodCount: newStats.goodCount,
          easyCount: newStats.easyCount,
          lastReview: newStats.lastReview ?? undefined,
        },
      });

      return createdCard;
    });

    // Si le deck est public, synchroniser tous les decks importés
    if (deck.isPublic) {
      await syncImportedDecks(deckId);
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error('Create card error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la carte' },
      { status: 500 }
    );
  }
}
