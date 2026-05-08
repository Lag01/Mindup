import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { updateUserStreak } from '@/lib/streak';

interface RouteContext {
  params: Promise<{ id: string }>;
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

    // Verify deck belongs to user
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    // Réinitialiser les compteurs des Review (sans supprimer les lignes)
    // pour préserver les ReviewEvent associés (utilisés par le leaderboard et l'admin)
    await prisma.review.updateMany({
      where: {
        userId: user.id,
        card: {
          deckId: deckId,
        },
      },
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
        status: 'NEW',
      },
    });

    // Recalculer le streak après réinitialisation
    try {
      await updateUserStreak(user.id);
    } catch (streakError) {
      console.error('Erreur lors de la mise à jour du streak après reset:', streakError);
    }

    return NextResponse.json({
      success: true,
      message: 'Statistiques réinitialisées avec succès',
    });
  } catch (error) {
    console.error('Reset deck stats error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation des statistiques' },
      { status: 500 }
    );
  }
}
