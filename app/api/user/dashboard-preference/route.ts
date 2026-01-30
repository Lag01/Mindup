import { NextResponse } from 'next/server';
import { getCurrentUserWithDashboard } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/dashboard-preference
 * Récupère les préférences dashboard de l'utilisateur connecté
 */
export async function GET() {
  try {
    const user = await getCurrentUserWithDashboard();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      version: user.dashboardVersion,
      dashboardVersion: user.dashboardVersion, // Alias pour compatibilité
      choiceDate: user.dashboardChoiceDate,
      feedbackGiven: user.dashboardFeedbackGiven,
      feedbackRating: user.dashboardFeedbackRating,
    });
  } catch (error) {
    console.error('Error fetching dashboard preferences:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/dashboard-preference
 * Sauvegarde le choix de dashboard
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

    const body = await request.json();
    const { version } = body;

    // Validation
    if (!version || (version !== 'v1' && version !== 'v2')) {
      return NextResponse.json(
        { error: 'Version invalide' },
        { status: 400 }
      );
    }

    // Déterminer si c'est le premier choix
    const isFirstChoice = user.dashboardVersion === null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        dashboardVersion: version,
        // Ne mettre à jour dashboardChoiceDate que si c'est le premier choix
        ...(isFirstChoice && { dashboardChoiceDate: new Date() }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving dashboard preference:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
