import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { updateUserStreak } from '@/lib/streak';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
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
    const { learningMethod, budgetMode, cardsPerDay, newCardsPerDay, maxReviewsPerDay } = body;

    if (learningMethod && !['IMMEDIATE', 'ANKI'].includes(learningMethod)) {
      return NextResponse.json(
        { error: 'Méthode d\'apprentissage invalide' },
        { status: 400 }
      );
    }

    if (budgetMode !== undefined && !['SEPARATE', 'TOTAL'].includes(budgetMode)) {
      return NextResponse.json(
        { error: 'Mode de budget invalide' },
        { status: 400 }
      );
    }

    // Mode TOTAL : objectif quotidien unique >= 1.
    const validatedCardsPerDay =
      typeof cardsPerDay === 'number' && cardsPerDay >= 1
        ? Math.round(cardsPerDay)
        : undefined;
    // Mode SEPARATE : deux quotas indépendants. Nouvelles : >= 0 (0 = pause des nouvelles
    // cartes). Révisions : >= 1.
    const validatedNewCardsPerDay =
      typeof newCardsPerDay === 'number' && newCardsPerDay >= 0
        ? Math.round(newCardsPerDay)
        : undefined;
    const validatedMaxReviewsPerDay =
      typeof maxReviewsPerDay === 'number' && maxReviewsPerDay >= 1
        ? Math.round(maxReviewsPerDay)
        : undefined;

    const limitsData = {
      ...(budgetMode !== undefined ? { budgetMode } : {}),
      ...(validatedCardsPerDay !== undefined ? { cardsPerDay: validatedCardsPerDay } : {}),
      ...(validatedNewCardsPerDay !== undefined ? { newCardsPerDay: validatedNewCardsPerDay } : {}),
      ...(validatedMaxReviewsPerDay !== undefined ? { maxReviewsPerDay: validatedMaxReviewsPerDay } : {}),
    };

    // Vérifier que le deck existe et appartient à l'utilisateur
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      select: {
        id: true,
        learningMethod: true,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    const methodChanged = learningMethod && deck.learningMethod !== learningMethod;

    if (methodChanged) {
      // Z2-03 : changement de méthode = reset des stats SANS supprimer Review (sinon les
      // ReviewEvent en cascade disparaissent → leaderboard et admin perdent l'historique).
      await prisma.$transaction([
        prisma.review.updateMany({
          where: { userId: user.id, card: { deckId } },
          data: {
            reps: 0,
            againCount: 0,
            hardCount: 0,
            goodCount: 0,
            easyCount: 0,
            lastReview: null,
            interval: null,
            nextReview: null,
            easeFactor: 2.5,
            stability: 0,
            difficulty: 0,
            lapses: 0,
            status: 'NEW',
          },
        }),
        prisma.deck.update({
          where: { id: deckId },
          data: {
            learningMethod,
            ...limitsData,
          },
        }),
      ]);

      try {
        await updateUserStreak(user.id);
      } catch (streakError) {
        console.error('Erreur lors de la mise à jour du streak après changement de méthode:', streakError);
      }

      return NextResponse.json({
        success: true,
        message: 'Méthode d\'apprentissage modifiée et statistiques réinitialisées',
        methodChanged: true,
      });
    }

    // Mise à jour des quotas quotidiens uniquement (sans réinitialisation)
    if (Object.keys(limitsData).length > 0) {
      await prisma.deck.update({
        where: { id: deckId },
        data: limitsData,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Paramètres mis à jour',
      methodChanged: false,
    });
  } catch (error) {
    console.error('Update deck settings error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification des paramètres' },
      { status: 500 }
    );
  }
}
