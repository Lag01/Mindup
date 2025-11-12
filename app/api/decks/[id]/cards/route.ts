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
