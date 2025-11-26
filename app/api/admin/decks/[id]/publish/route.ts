import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/decks/[id]/publish
 * Publier un deck (admin uniquement)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier que l'utilisateur est admin
    const admin = await requireAdmin();

    const { id: deckId } = await context.params;

    // Vérifier que le deck existe et appartient à l'admin
    const deck = await prisma.deck.findUnique({
      where: { id: deckId }
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    if (deck.userId !== admin.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez publier que vos propres decks' },
        { status: 403 }
      );
    }

    if (deck.isPublic) {
      return NextResponse.json(
        { error: 'Ce deck est déjà public' },
        { status: 400 }
      );
    }

    if (deck.originalDeckId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas publier un deck importé' },
        { status: 400 }
      );
    }

    // Publier le deck
    const updatedDeck = await prisma.deck.update({
      where: { id: deckId },
      data: {
        isPublic: true
      }
    });

    return NextResponse.json({
      success: true,
      deck: updatedDeck
    });
  } catch (error: any) {
    console.error('Erreur lors de la publication du deck:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la publication du deck' },
      { status: 500 }
    );
  }
}
