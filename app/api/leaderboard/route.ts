import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // Requête pour compter le total d'utilisateurs dans le leaderboard (all-time)
    const totalUsersAllTime = await prisma.reviewEvent.groupBy({
      by: ['userId'],
    });
    const totalUsers = totalUsersAllTime.length;

    // Requête pour compter les révisions par utilisateur (all-time) avec pagination
    const skip = (page - 1) * limit;
    const leaderboardData = await prisma.reviewEvent.groupBy({
      by: ['userId'],
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
      leaderboard,
      currentUserId: user.id,
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
