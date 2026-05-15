import { NextResponse } from 'next/server';
import { getCurrentUserWithDashboard } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/dashboard-preference
 * Récupère la préférence de thème (v1 ou v3) et le statut admin.
 * Pour les non-admin, la version effective est toujours v1.
 */
export async function GET() {
  try {
    const user = await getCurrentUserWithDashboard();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const effectiveVersion = user.isAdmin
      ? user.dashboardVersion === 'v1'
        ? 'v1'
        : 'v3'
      : 'v1';

    return NextResponse.json({
      version: effectiveVersion,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error('Error fetching dashboard preference:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/user/dashboard-preference
 * Permet uniquement à un admin de basculer entre v1 et v3.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUserWithDashboard();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Réservé aux administrateurs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { version } = body;

    if (version !== 'v1' && version !== 'v3') {
      return NextResponse.json({ error: 'Version invalide' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { dashboardVersion: version },
    });

    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('Error saving dashboard preference:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
