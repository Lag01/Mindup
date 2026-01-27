import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/user/dashboard-feedback
 * Sauvegarde le feedback utilisateur sur le dashboard v2
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
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
