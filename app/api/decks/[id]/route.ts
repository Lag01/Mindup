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
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Le nom est requis' },
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

    // Update deck name
    const updatedDeck = await prisma.deck.update({
      where: {
        id: deckId,
      },
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      deck: updatedDeck,
    });
  } catch (error) {
    console.error('Update deck error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du deck' },
      { status: 500 }
    );
  }
}
