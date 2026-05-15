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
    const { learningMethod, newCardsPerDay, maxReviewsPerDay } = body;

    if (learningMethod && !['IMMEDIATE', 'ANKI'].includes(learningMethod)) {
      return NextResponse.json(
        { error: 'Méthode d\'apprentissage invalide' },
        { status: 400 }
      );
    }

    const validatedNewCardsPerDay =
      typeof newCardsPerDay === 'number' && newCardsPerDay >= 1
        ? Math.round(newCardsPerDay)
        : undefined;
    const validatedMaxReviewsPerDay =
      typeof maxReviewsPerDay === 'number' && maxReviewsPerDay >= 1
        ? Math.round(maxReviewsPerDay)
        : undefined;

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
      // Changement de méthode : réinitialiser toutes les statistiques
      await prisma.$transaction([
        prisma.review.deleteMany({
          where: { userId: user.id, card: { deckId } },
        }),
        prisma.deck.update({
          where: { id: deckId },
          data: {
            learningMethod,
            ...(validatedNewCardsPerDay !== undefined ? { newCardsPerDay: validatedNewCardsPerDay } : {}),
            ...(validatedMaxReviewsPerDay !== undefined ? { maxReviewsPerDay: validatedMaxReviewsPerDay } : {}),
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

    // Mise à jour des limites uniquement (sans réinitialisation)
    if (validatedNewCardsPerDay !== undefined || validatedMaxReviewsPerDay !== undefined) {
      await prisma.deck.update({
        where: { id: deckId },
        data: {
          ...(validatedNewCardsPerDay !== undefined ? { newCardsPerDay: validatedNewCardsPerDay } : {}),
          ...(validatedMaxReviewsPerDay !== undefined ? { maxReviewsPerDay: validatedMaxReviewsPerDay } : {}),
        },
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
