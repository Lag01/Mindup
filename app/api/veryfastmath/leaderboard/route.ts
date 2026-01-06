import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';

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
    const mode = searchParams.get('mode') as MathMode | null;

    // Validation du mode
    if (!mode || !['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION'].includes(mode)) {
      return NextResponse.json(
        { error: 'Mode invalide. Utilisez: ADDITION, SUBTRACTION, MULTIPLICATION, DIVISION' },
        { status: 400 }
      );
    }

    // Récupérer tous les scores pour ce mode (all-time)
    const scores = await prisma.veryFastMathScore.findMany({
      where: {
        mode,
      },
      orderBy: {
        score: 'desc',
      },
      select: {
        userId: true,
        score: true,
        createdAt: true,
      },
    });

    // Grouper par userId et garder le meilleur score de chaque utilisateur
    const userBestScores = new Map<string, { score: number; createdAt: Date }>();

    scores.forEach(scoreEntry => {
      const current = userBestScores.get(scoreEntry.userId);
      if (!current || scoreEntry.score > current.score) {
        userBestScores.set(scoreEntry.userId, {
          score: scoreEntry.score,
          createdAt: scoreEntry.createdAt,
        });
      }
    });

    // Trier par score décroissant
    const sorted = Array.from(userBestScores.entries())
      .sort((a, b) => b[1].score - a[1].score);

    // Récupérer les informations des utilisateurs
    const userIds = sorted.map(([userId]) => userId);
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

    const userMap = new Map(users.map(u => [u.id, u.displayName]));

    // Construire le leaderboard
    const leaderboard = sorted.map(([userId, data], index) => ({
      rank: index + 1,
      userId,
      displayName: userMap.get(userId) || 'Utilisateur inconnu',
      bestScore: data.score,
      achievedAt: data.createdAt.toISOString(),
    }));

    return NextResponse.json({
      mode,
      leaderboard,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du leaderboard' },
      { status: 500 }
    );
  }
}
