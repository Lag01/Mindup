import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { syncImportedDecks } from '@/lib/sync-decks';
import { deleteImagesAsync } from '@/lib/image-cleanup';

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
    const { front, back, frontType, backType, frontImage, backImage } = body;

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

    // Validation des chemins d'images (accepter URLs locales et Vercel Blob)
    if (frontImage !== undefined && frontImage !== null) {
      const isValidPath =
        frontImage.startsWith('/uploads/cards/') ||
        frontImage.startsWith('https://') ||
        frontImage.startsWith('http://');
      if (!isValidPath) {
        return NextResponse.json(
          { error: 'Chemin image recto invalide' },
          { status: 400 }
        );
      }
    }
    if (backImage !== undefined && backImage !== null) {
      const isValidPath =
        backImage.startsWith('/uploads/cards/') ||
        backImage.startsWith('https://') ||
        backImage.startsWith('http://');
      if (!isValidPath) {
        return NextResponse.json(
          { error: 'Chemin image verso invalide' },
          { status: 400 }
        );
      }
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

    // Détecter les images à supprimer (si changées)
    const imagesToDelete: string[] = [];

    if (frontImage !== undefined && card.frontImage && frontImage !== card.frontImage) {
      // L'image recto a changé, supprimer l'ancienne
      imagesToDelete.push(card.frontImage);
    }

    if (backImage !== undefined && card.backImage && backImage !== card.backImage) {
      // L'image verso a changé, supprimer l'ancienne
      imagesToDelete.push(card.backImage);
    }

    // Update card
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        front: front !== undefined ? front : card.front,
        back: back !== undefined ? back : card.back,
        frontType: frontType !== undefined ? frontType : card.frontType,
        backType: backType !== undefined ? backType : card.backType,
        frontImage: frontImage !== undefined ? frontImage : card.frontImage,
        backImage: backImage !== undefined ? backImage : card.backImage,
      },
    });

    // Nettoyage asynchrone des anciennes images (après mise à jour réussie)
    if (imagesToDelete.length > 0) {
      deleteImagesAsync(imagesToDelete).catch(err =>
        console.error('[CLEANUP] Erreur nettoyage images modifiées:', err)
      );
    }

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

    // Sauvegarder l'ID du deck et les images avant de supprimer la carte
    const deckId = card.deck.id;
    const isDeckPublic = card.deck.isPublic;
    const imagesToDelete = [card.frontImage, card.backImage].filter(Boolean) as string[];

    // Delete card (reviews will be deleted automatically due to cascade)
    await prisma.card.delete({
      where: { id: cardId },
    });

    // Nettoyage asynchrone des images (ne bloque pas la réponse)
    if (imagesToDelete.length > 0) {
      deleteImagesAsync(imagesToDelete).catch(err =>
        console.error('[CLEANUP] Erreur nettoyage images supprimées:', err)
      );
    }

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
