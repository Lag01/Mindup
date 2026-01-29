import { NextResponse } from 'next/server';
import { getCurrentUserWithDashboard } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/user/dashboard-feedback
 * Sauvegarde le feedback utilisateur sur le dashboard v2
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUserWithDashboard();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Validation : feedback déjà donné
    if (user.dashboardFeedbackGiven) {
      return NextResponse.json(
        { error: 'Feedback déjà enregistré' },
        { status: 400 }
      );
    }

    // Validation : utilisateur doit être en v2
    if (user.dashboardVersion !== 'v2') {
      return NextResponse.json(
        { error: 'Feedback uniquement disponible pour les utilisateurs v2' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rating, switchBack } = body;

    // Validation
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Note invalide (doit être entre 1 et 5)' },
        { status: 400 }
      );
    }

    if (typeof switchBack !== 'boolean') {
      return NextResponse.json(
        { error: 'switchBack invalide' },
        { status: 400 }
      );
    }

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        dashboardFeedbackRating: rating,
        dashboardFeedbackDate: new Date(),
        dashboardFeedbackGiven: true,
        // Retour à v1 si l'utilisateur le souhaite
        ...(switchBack && { dashboardVersion: 'v1' }),
      },
    });

    return NextResponse.json({
      success: true,
      newVersion: updatedUser.dashboardVersion,
    });
  } catch (error) {
    console.error('Error saving dashboard feedback:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
