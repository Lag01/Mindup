import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface LeaderboardRow {
  userId: string;
  displayName: string | null;
  reviewCount: bigint;
  totalUsers: bigint;
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // Une seule requête SQL avec COUNT(*) OVER() pour le total + JOIN users
    const rows = await prisma.$queryRaw<LeaderboardRow[]>`
      SELECT
        re."userId",
        u."displayName",
        COUNT(re.id) AS "reviewCount",
        COUNT(*) OVER() AS "totalUsers"
      FROM "ReviewEvent" re
      JOIN "User" u ON u.id = re."userId"
      GROUP BY re."userId", u."displayName"
      ORDER BY "reviewCount" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalUsers = rows.length > 0 ? Number(rows[0].totalUsers) : 0;

    const leaderboard = rows.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      displayName: row.displayName || 'Utilisateur inconnu',
      reviewCount: Number(row.reviewCount),
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
