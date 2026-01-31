import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
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

    const { id: deckId } = await context.params;

    // Paramètres de recherche et pagination
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validation de la query
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'La recherche nécessite au moins 2 caractères' },
        { status: 400 }
      );
    }

    // Validation des paramètres de pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Paramètres de pagination invalides' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // Vérifier que le deck appartient à l'utilisateur
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        originalDeckId: true,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    // Recherche dans les cartes du deck
    const searchQuery = query.trim();
    const [totalCards, cards] = await Promise.all([
      // Compter le nombre total de résultats
      prisma.card.count({
        where: {
          deckId,
          OR: [
            { front: { contains: searchQuery, mode: 'insensitive' } },
            { back: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
      }),
      // Récupérer les cartes paginées
      prisma.card.findMany({
        where: {
          deckId,
          OR: [
            { front: { contains: searchQuery, mode: 'insensitive' } },
            { back: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        skip,
        take: limit,
        orderBy: {
          order: 'desc',
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCards / limit);

    return NextResponse.json({
      deck: {
        id: deck.id,
        name: deck.name,
        cards,
        originalDeckId: deck.originalDeckId,
      },
      pagination: {
        page,
        limit,
        totalCards,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      searchQuery,
    });
  } catch (error) {
    console.error('Search deck cards error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
}
