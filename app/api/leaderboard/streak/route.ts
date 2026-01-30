import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'current';

    if (mode !== 'current' && mode !== 'max') {
      return NextResponse.json(
        { error: 'Mode invalide. Utilisez "current" ou "max"' },
        { status: 400 }
      );
    }

    const orderByField = mode === 'max' ? 'maxStreak' : 'currentStreak';

    // Pour le mode current, ne montrer que les streaks récentes (mises à jour dans les 2 derniers jours)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);

    const whereClause: any = {
      [orderByField]: {
        gt: 0,
      },
    };

    // Filtrer les streaks périmées en mode current
    if (mode === 'current') {
      whereClause.lastStreakUpdate = {
        gte: twoDaysAgo,
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        displayName: true,
        currentStreak: true,
        maxStreak: true,
      },
      orderBy: {
        [orderByField]: 'desc',
      },
      take: 50,
    });

    const leaderboard = users.map((u, index) => ({
      rank: index + 1,
      userId: u.id,
      displayName: u.displayName,
      currentStreak: u.currentStreak,
      maxStreak: u.maxStreak,
    }));

    return NextResponse.json({
      mode,
      leaderboard,
      currentUserId: user.id,
    });
  } catch (error) {
    console.error('Streak leaderboard error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du classement' },
      { status: 500 }
    );
  }
}
