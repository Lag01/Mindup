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
    const { updateFront, updateBack, targetType } = body;

    if (!targetType || (targetType !== 'TEXT' && targetType !== 'LATEX')) {
      return NextResponse.json(
        { error: 'Le type cible doit être TEXT ou LATEX' },
        { status: 400 }
      );
    }

    if (!updateFront && !updateBack) {
      return NextResponse.json(
        { error: 'Au moins updateFront ou updateBack doit être true' },
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

    // Build update data object
    const updateData: any = {};
    if (updateFront) {
      updateData.frontType = targetType;
    }
    if (updateBack) {
      updateData.backType = targetType;
    }

    // Update all cards in the deck
    const result = await prisma.card.updateMany({
      where: {
        deckId: deckId,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error('Bulk update types error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour en masse' },
      { status: 500 }
    );
  }
}
