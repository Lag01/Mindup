import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isValidImageUrl } from '@/lib/utils/validate-image-url';
import { validateCardContent } from '@/lib/utils/validate-card';
import { handlePrismaError } from '@/lib/utils/error-handler';
import { createNewReviewStats } from '@/lib/revision';
import { syncImportedDecks } from '@/lib/sync-decks';

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

    // Paramètres de pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validation des paramètres
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Paramètres de pagination invalides' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // Verify deck belongs to user
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

    // Récupérer le nombre total de cartes et les cartes paginées en parallèle
    const [totalCards, cards] = await Promise.all([
      prisma.card.count({
        where: { deckId },
      }),
      prisma.card.findMany({
        where: { deckId },
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
    });
  } catch (error) {
    console.error('Get deck cards error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des cartes' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const body = await request.json();
    const { front, back, frontType, backType, frontImage, backImage } = body;

    // Validation : au moins du contenu (texte OU image) pour chaque côté
    const hasFrontContent = (front && front.trim()) || frontImage;
    const hasBackContent = (back && back.trim()) || backImage;

    if (!hasFrontContent || !hasBackContent) {
      return NextResponse.json(
        { error: 'Le recto et le verso doivent contenir du texte ou une image' },
        { status: 400 }
      );
    }

    if (!['TEXT', 'LATEX'].includes(frontType) || !['TEXT', 'LATEX'].includes(backType)) {
      return NextResponse.json(
        { error: 'Type de contenu invalide' },
        { status: 400 }
      );
    }

    // Validation stricte des URLs d'images
    // Log pour débogage
    if (frontImage) {
      console.log('[Create Card] Validation image recto:', {
        url: frontImage,
        isValid: isValidImageUrl(frontImage)
      });
    }

    if (frontImage && !isValidImageUrl(frontImage)) {
      return NextResponse.json(
        { error: 'URL d\'image recto invalide ou domaine non autorisé' },
        { status: 400 }
      );
    }

    // Log pour débogage
    if (backImage) {
      console.log('[Create Card] Validation image verso:', {
        url: backImage,
        isValid: isValidImageUrl(backImage)
      });
    }

    if (backImage && !isValidImageUrl(backImage)) {
      return NextResponse.json(
        { error: 'URL d\'image verso invalide ou domaine non autorisé' },
        { status: 400 }
      );
    }

    // Validation du contenu (longueur et LaTeX)
    // Log pour débogage
    console.log('[Create Card] Validation contenu:', {
      frontLength: (front || '').length,
      backLength: (back || '').length,
      frontType,
      backType
    });

    const contentValidation = validateCardContent(front || '', back || '', frontType, backType);
    if (!contentValidation.valid) {
      console.error('[Create Card] Validation échouée:', contentValidation.error);
      return NextResponse.json(
        { error: contentValidation.error },
        { status: 400 }
      );
    }

    // Si seulement une image est fournie, utiliser une valeur par défaut pour le texte
    const finalFront = (front && front.trim()) ? front : '';
    const finalBack = (back && back.trim()) ? back : '';

    // Verify deck belongs to user
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      include: {
        cards: {
          orderBy: {
            order: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    // Bloquer l'ajout de cartes aux decks importés
    if (deck.originalDeckId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas ajouter de cartes à un deck importé. Il est synchronisé avec le deck public.' },
        { status: 403 }
      );
    }

    // Calculate next order number
    const nextOrder = deck.cards.length > 0 ? deck.cards[0].order + 1 : 0;

    // Create card and review in a transaction
    const card = await prisma.$transaction(async (tx) => {
      // Create the card
      const createdCard = await tx.card.create({
        data: {
          deckId: deckId,
          front: finalFront,
          back: finalBack,
          frontType,
          backType,
          frontImage: frontImage || null,
          backImage: backImage || null,
          order: nextOrder,
        },
      });

      // Create initial review for the card
      const newStats = createNewReviewStats();
      await tx.review.create({
        data: {
          cardId: createdCard.id,
          userId: user.id,
          reps: newStats.reps,
          againCount: newStats.againCount,
          hardCount: newStats.hardCount,
          goodCount: newStats.goodCount,
          easyCount: newStats.easyCount,
          lastReview: newStats.lastReview ?? undefined,
        },
      });

      return createdCard;
    });

    // Si le deck est public, synchroniser tous les decks importés
    if (deck.isPublic) {
      await syncImportedDecks(deckId);
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error('Create card error:', error);
    return NextResponse.json(
      { error: handlePrismaError(error) },
      { status: 500 }
    );
  }
}
