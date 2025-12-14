import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/public-decks
 * Liste tous les decks publics disponibles avec pagination
 * Query params: page (défaut: 1), limit (défaut: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est connecté
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer les paramètres de pagination
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Compter le total de decks publics (pour pagination côté client)
    const totalDecks = await prisma.deck.count({
      where: {
        isPublic: true
      }
    });

    // Récupérer les decks publics avec pagination
    const publicDecks = await prisma.deck.findMany({
      where: {
        isPublic: true
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true
          }
        },
        cards: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
    });

    // Récupérer les IDs des decks déjà importés par l'utilisateur
    const userImportedDecks = await prisma.deck.findMany({
      where: {
        userId: user.id,
        originalDeckId: {
          not: null
        }
      },
      select: {
        originalDeckId: true
      }
    });

    const importedDeckIds = new Set(
      userImportedDecks
        .map(d => d.originalDeckId)
        .filter((id): id is string => id !== null)
    );

    // Formatter les données
    const formattedDecks = publicDecks.map(deck => ({
      id: deck.id,
      name: deck.name,
      createdAt: deck.createdAt,
      authorEmail: deck.user.email,
      authorName: deck.user.displayName,
      cardCount: deck.cards.length,
      importCount: deck.importCount,
      isImported: importedDeckIds.has(deck.id)
    }));

    return NextResponse.json({
      decks: formattedDecks,
      pagination: {
        page,
        limit,
        total: totalDecks,
        totalPages: Math.ceil(totalDecks / limit),
        hasNext: page < Math.ceil(totalDecks / limit),
        hasPrev: page > 1,
      }
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des decks publics:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des decks publics' },
      { status: 500 }
    );
  }
}
