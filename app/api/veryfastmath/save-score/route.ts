import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mode, score } = body as { mode: MathMode; score: number };

    // Validation des paramètres
    if (!mode || typeof score !== 'number') {
      return NextResponse.json(
        { error: 'Paramètres invalides. mode et score requis.' },
        { status: 400 }
      );
    }

    if (!['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION'].includes(mode)) {
      return NextResponse.json(
        { error: 'Mode invalide. Utilisez: ADDITION, SUBTRACTION, MULTIPLICATION, DIVISION' },
        { status: 400 }
      );
    }

    // Validation du score (max 100 opérations par minute pour éviter la triche)
    if (score < 0 || score > 100) {
      return NextResponse.json(
        { error: 'Score invalide. Le score doit être entre 0 et 100.' },
        { status: 400 }
      );
    }

    // Sauvegarder le score
    await prisma.veryFastMathScore.create({
      data: {
        userId: user.id,
        mode,
        score,
      },
    });

    // Récupérer le meilleur score de l'utilisateur pour ce mode
    const bestScore = await prisma.veryFastMathScore.findFirst({
      where: {
        userId: user.id,
        mode,
      },
      orderBy: {
        score: 'desc',
      },
    });

    const isNewRecord = bestScore ? score === bestScore.score : false;
    const currentBest = bestScore?.score || 0;

    return NextResponse.json({
      savedScore: score,
      isNewRecord,
      currentBest,
    });
  } catch (error) {
    console.error('Save score error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde du score' },
      { status: 500 }
    );
  }
}
