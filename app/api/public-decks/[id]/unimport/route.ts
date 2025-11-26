import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { unimportPublicDeck } from '@/lib/sync-decks';

/**
 * DELETE /api/public-decks/[id]/unimport
 * Retirer un deck importé de son profil
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier que l'utilisateur est connecté
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id: importedDeckId } = await context.params;

    // Retirer le deck importé
    await unimportPublicDeck(user.id, importedDeckId);

    return NextResponse.json({
      success: true,
      message: 'Deck retiré avec succès'
    });
  } catch (error: any) {
    console.error('Erreur lors du retrait du deck:', error);

    // Retourner des erreurs spécifiques
    if (error.message.includes('non trouvé')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message.includes('n\'est pas un deck importé') || error.message.includes('ne vous appartient pas')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Erreur lors du retrait du deck' },
      { status: 500 }
    );
  }
}
