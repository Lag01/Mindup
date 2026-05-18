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

    // Vérifier l'ownership sans charger toutes les cartes
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: user.id },
      select: { id: true, _count: { select: { cards: true } } },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    // Z2-12 : swap atomique en un seul UPDATE plutôt que N requêtes.
    // Les enum frontType/backType sont castés explicitement pour Postgres.
    await prisma.$executeRaw`
      UPDATE "Card"
      SET
        front = back,
        back = front,
        "frontType" = "backType",
        "backType" = "frontType",
        "frontImage" = "backImage",
        "backImage" = "frontImage"
      WHERE "deckId" = ${deckId}
    `;

    return NextResponse.json({
      success: true,
      swappedCount: deck._count.cards,
    });
  } catch (error) {
    console.error('Swap all cards error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'inversion des cartes' },
      { status: 500 }
    );
  }
}
