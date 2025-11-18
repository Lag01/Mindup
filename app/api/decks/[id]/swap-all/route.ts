import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
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
        cards: true,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    // Swap front and back for all cards
    const updatePromises = deck.cards.map(card =>
      prisma.card.update({
        where: { id: card.id },
        data: {
          front: card.back,
          back: card.front,
          frontType: card.backType,
          backType: card.frontType,
        },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      swappedCount: deck.cards.length,
    });
  } catch (error) {
    console.error('Swap all cards error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'inversion des cartes' },
      { status: 500 }
    );
  }
}
