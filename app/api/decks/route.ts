import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { unimportPublicDeck } from '@/lib/sync-decks';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate statistics for each deck
    const decksWithStats = decks.map(deck => {
      const totalCards = deck.cards.length;

      // Dans le système de révision immédiate, toutes les cartes sont disponibles
      // On compte les cartes jamais révisées pour donner une indication de progression
      const notStarted = deck.cards.filter(card => {
        const review = card.reviews[0];
        return !review || review.reps === 0;
      }).length;

      // Calculer le taux de révision
      const totalReviews = deck.cards.reduce((sum, card) => {
        const review = card.reviews[0];
        return sum + (review?.reps || 0);
      }, 0);

      return {
        id: deck.id,
        name: deck.name,
        createdAt: deck.createdAt,
        totalCards,
        notStarted,
        totalReviews,
        isPublic: deck.isPublic,
        originalDeckId: deck.originalDeckId,
        isImported: !!deck.originalDeckId,
      };
    });

    return NextResponse.json({ decks: decksWithStats });
  } catch (error) {
    console.error('Get decks error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des decks' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('id');

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

    // Si c'est un deck importé, utiliser unimportPublicDeck pour décrémenter le compteur
    if (deck.originalDeckId) {
      await unimportPublicDeck(user.id, deckId);
      return NextResponse.json({ success: true });
    }

    // Bloquer la suppression des decks publics (utiliser unpublish d'abord)
    if (deck.isPublic) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer un deck public. Veuillez d\'abord le dépublier depuis le panel admin.' },
        { status: 403 }
      );
    }

    // Delete deck (cascade will delete cards and reviews)
    await prisma.deck.delete({
      where: {
        id: deckId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete deck error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du deck' },
      { status: 500 }
    );
  }
}
