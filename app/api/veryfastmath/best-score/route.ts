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

    // Récupérer le meilleur score pour ce mode
    const bestScore = await prisma.veryFastMathScore.findUnique({
      where: {
        userId_mode: {
          userId: user.id,
          mode,
        },
      },
      select: {
        score: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      mode,
      bestScore: bestScore?.score || null,
      lastPlayedAt: bestScore?.createdAt.toISOString() || null,
    });
  } catch (error) {
    console.error('Best score error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du meilleur score' },
      { status: 500 }
    );
  }
}
