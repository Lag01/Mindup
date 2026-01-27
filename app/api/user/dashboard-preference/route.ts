import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/dashboard-preference
 * Récupère les préférences dashboard de l'utilisateur connecté
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        dashboardVersion: true,
        dashboardChoiceDate: true,
        dashboardFeedbackGiven: true,
        dashboardFeedbackRating: true,
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      version: userData.dashboardVersion,
      choiceDate: userData.dashboardChoiceDate,
      feedbackGiven: userData.dashboardFeedbackGiven,
      feedbackRating: userData.dashboardFeedbackRating,
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
    const user = await getCurrentUser();

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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        dashboardVersion: version,
        dashboardChoiceDate: new Date(),
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
