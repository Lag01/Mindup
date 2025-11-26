import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { syncImportedDecks } from '@/lib/sync-decks';

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

    // Validation
    if (frontType !== undefined && !['TEXT', 'LATEX'].includes(frontType)) {
      return NextResponse.json(
        { error: 'Type de contenu invalide pour le recto' },
        { status: 400 }
      );
    }

    if (backType !== undefined && !['TEXT', 'LATEX'].includes(backType)) {
      return NextResponse.json(
        { error: 'Type de contenu invalide pour le verso' },
        { status: 400 }
      );
    }

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

    // Bloquer la modification des cartes de decks importés
    if (card.deck.originalDeckId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas modifier les cartes d\'un deck importé. Il est synchronisé avec le deck public.' },
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

    // Si le deck est public, synchroniser tous les decks importés
    if (card.deck.isPublic) {
      await syncImportedDecks(card.deck.id);
    }

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

    // Bloquer la suppression des cartes de decks importés
    if (card.deck.originalDeckId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer les cartes d\'un deck importé. Il est synchronisé avec le deck public.' },
        { status: 403 }
      );
    }

    // Sauvegarder l'ID du deck avant de supprimer la carte
    const deckId = card.deck.id;
    const isDeckPublic = card.deck.isPublic;

    // Delete card (reviews will be deleted automatically due to cascade)
    await prisma.card.delete({
      where: { id: cardId },
    });

    // Si le deck est public, synchroniser tous les decks importés
    if (isDeckPublic) {
      await syncImportedDecks(deckId);
    }

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
