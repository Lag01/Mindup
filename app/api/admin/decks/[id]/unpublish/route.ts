import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { unpublishDeck } from '@/lib/sync-decks';
import { prisma } from '@/lib/prisma';

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
    const admin = await requireAdmin();

    const { id: deckId } = await context.params;

    // Dépublier le deck
    await unpublishDeck(deckId);

    // Audit log de l'action admin (action destructive : suppression des decks importés).
    try {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'DECK_UNPUBLISH',
          targetType: 'deck',
          targetId: deckId,
          ipAddress: request.headers.get('x-forwarded-for') ?? null,
          userAgent: request.headers.get('user-agent') ?? null,
        },
      });
    } catch (logError) {
      console.error('Audit log unpublish failure:', logError);
    }

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
