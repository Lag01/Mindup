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

    const { id: cardId } = await context.params;
    const body = await request.json();
    const { front, back, frontType, backType } = body;

    // Verify card belongs to user's deck
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        deck: true,
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Carte non trouvée' },
        { status: 404 }
      );
    }

    if (card.deck.userId !== user.id) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Update card
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        front: front !== undefined ? front : card.front,
        back: back !== undefined ? back : card.back,
        frontType: frontType !== undefined ? frontType : card.frontType,
        backType: backType !== undefined ? backType : card.backType,
      },
    });

    return NextResponse.json({
      success: true,
      card: updatedCard,
    });
  } catch (error) {
    console.error('Update card error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la carte' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { id: cardId } = await context.params;

    // Verify card belongs to user's deck
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        deck: true,
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Carte non trouvée' },
        { status: 404 }
      );
    }

    if (card.deck.userId !== user.id) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Delete card (reviews will be deleted automatically due to cascade)
    await prisma.card.delete({
      where: { id: cardId },
    });

    return NextResponse.json({
      success: true,
      message: 'Carte supprimée avec succès',
    });
  } catch (error) {
    console.error('Delete card error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la carte' },
      { status: 500 }
    );
  }
}
