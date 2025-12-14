import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, rotateRefreshToken } from '@/lib/refresh-token';
import { signToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token requis' },
        { status: 400 }
      );
    }

    // Vérifier le refresh token
    const verification = await verifyRefreshToken(refreshToken);

    if (!verification.valid || !verification.userId) {
      return NextResponse.json(
        { error: 'Refresh token invalide ou expiré' },
        { status: 401 }
      );
    }

    // Récupérer les infos utilisateur
    const user = await prisma.user.findUnique({
      where: { id: verification.userId },
      select: {
        id: true,
        email: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Rotation du refresh token (sécurité)
    const rotation = await rotateRefreshToken(refreshToken);

    if (!rotation.success || !rotation.newToken) {
      return NextResponse.json(
        { error: 'Erreur lors de la rotation du token' },
        { status: 500 }
      );
    }

    // Générer un nouveau access token
    const accessToken = await signToken({
      userId: user.id,
    });

    // Créer la réponse avec le nouveau access token en cookie
    const response = NextResponse.json({
      success: true,
      refreshToken: rotation.newToken,
    });

    // Set access token cookie
    response.cookies.set('session', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 60, // 2 heures
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du rafraîchissement du token' },
      { status: 500 }
    );
  }
}
