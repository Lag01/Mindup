import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { unpublishDeck } from '@/lib/sync-decks';

/**
 * POST /api/admin/decks/[id]/unpublish
 * Dépublier un deck et supprimer tous les decks importés (admin uniquement)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin();

    const { id: deckId } = await context.params;

    // Dépublier le deck
    await unpublishDeck(deckId);

    return NextResponse.json({
      success: true,
      message: 'Deck dépublié avec succès. Tous les decks importés ont été supprimés.'
    });
  } catch (error: any) {
    console.error('Erreur lors de la dépublication du deck:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la dépublication du deck' },
      { status: 500 }
    );
  }
}
