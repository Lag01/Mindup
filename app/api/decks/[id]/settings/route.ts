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
    const { learningMethod } = body;

    // Validation de la méthode d'apprentissage
    if (!learningMethod || !['IMMEDIATE', 'ANKI'].includes(learningMethod)) {
      return NextResponse.json(
        { error: 'Méthode d\'apprentissage invalide' },
        { status: 400 }
      );
    }

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

    // Si changement de méthode : réinitialiser toutes les statistiques
    if (deck.learningMethod !== learningMethod) {
      await prisma.$transaction([
        // Supprimer toutes les reviews du deck pour cet utilisateur
        prisma.review.deleteMany({
          where: {
            userId: user.id,
            card: {
              deckId: deckId,
            },
          },
        }),

        // Mettre à jour la méthode d'apprentissage
        prisma.deck.update({
          where: {
            id: deckId,
          },
          data: {
            learningMethod: learningMethod,
          },
        }),
      ]);

      // Recalculer le streak après changement de méthode (ReviewEvent supprimés)
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
    } else {
      // Pas de changement, juste confirmation
      return NextResponse.json({
        success: true,
        message: 'Aucun changement nécessaire',
        methodChanged: false,
      });
    }
  } catch (error) {
    console.error('Update deck settings error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification des paramètres' },
      { status: 500 }
    );
  }
}
