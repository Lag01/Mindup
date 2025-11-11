import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
      const now = new Date();

      const dueCards = deck.cards.filter(card => {
        const review = card.reviews[0];
        if (!review) return true; // New cards are due
        return review.due <= now;
      }).length;

      return {
        id: deck.id,
        name: deck.name,
        createdAt: deck.createdAt,
        totalCards,
        dueCards,
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
