import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { importPublicDeck } from '@/lib/sync-decks';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/public-decks/[id]/import
 * Importer un deck public dans son profil
 */
export async function POST(
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

    const { id: sourceDeckId } = await context.params;

    // Vérifier la limite de decks par utilisateur
    const settings = await prisma.appSettings.findFirst();
    const maxDecksPerUser = settings?.maxDecksPerUser || 10;

    const userDecksCount = await prisma.deck.count({
      where: { userId: user.id }
    });

    if (userDecksCount >= maxDecksPerUser) {
      return NextResponse.json(
        { error: `Vous avez atteint la limite de ${maxDecksPerUser} decks` },
        { status: 400 }
      );
    }

    // Importer le deck
    const importedDeck = await importPublicDeck(user.id, sourceDeckId);

    return NextResponse.json({
      success: true,
      deck: importedDeck
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'importation du deck:', error);

    // Retourner des erreurs spécifiques
    if (error.message.includes('non trouvé')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message.includes('déjà importé') || error.message.includes('pas public')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'importation du deck' },
      { status: 500 }
    );
  }
}
