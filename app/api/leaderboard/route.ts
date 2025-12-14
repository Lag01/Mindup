import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

type TimePeriod = 'today' | 'week' | 'month' | 'year';

function getDateRangeForPeriod(period: TimePeriod): Date {
  const now = new Date();

  switch (period) {
    case 'today': {
      // Début de la journée (00:00:00)
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      return start;
    }
    case 'week': {
      // Début de la semaine (lundi 00:00:00)
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lundi = 0
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'month': {
      // Début du mois (1er jour à 00:00:00)
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return start;
    }
    case 'year': {
      // Début de l'année (1er janvier à 00:00:00)
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      return start;
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'today') as TimePeriod;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    if (!['today', 'week', 'month', 'year'].includes(period)) {
      return NextResponse.json(
        { error: 'Période invalide. Utilisez: today, week, month, year' },
        { status: 400 }
      );
    }

    const startDate = getDateRangeForPeriod(period);

    // Requête pour compter le total d'utilisateurs dans le leaderboard
    const totalUsersInPeriod = await prisma.reviewEvent.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });
    const totalUsers = totalUsersInPeriod.length;

    // Requête pour compter les révisions par utilisateur dans la période avec pagination
    const skip = (page - 1) * limit;
    const leaderboardData = await prisma.reviewEvent.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      skip,
      take: limit,
    });

    // Récupérer les informations des utilisateurs
    const userIds = leaderboardData.map(entry => entry.userId);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        displayName: true,
      },
    });

    // Mapper les données avec les noms d'utilisateur
    const userMap = new Map(users.map(u => [u.id, u.displayName]));

    const leaderboard = leaderboardData.map((entry, index) => ({
      rank: skip + index + 1, // Rank global tenant compte de la pagination
      userId: entry.userId,
      displayName: userMap.get(entry.userId) || 'Utilisateur inconnu',
      reviewCount: entry._count.id,
    }));

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      leaderboard,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        hasNext: page < Math.ceil(totalUsers / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du leaderboard' },
      { status: 500 }
    );
  }
}
