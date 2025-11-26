import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/public-decks
 * Liste tous les decks publics disponibles
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

    // Récupérer tous les decks publics
    const publicDecks = await prisma.deck.findMany({
      where: {
        isPublic: true
      },
      include: {
        user: {
          select: {
            email: true
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
      }
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
      cardCount: deck.cards.length,
      importCount: deck.importCount,
      isImported: importedDeckIds.has(deck.id)
    }));

    return NextResponse.json({
      decks: formattedDecks
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des decks publics:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des decks publics' },
      { status: 500 }
    );
  }
}
