import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { verifyToken, decryptSecret } from '@/lib/two-factor';
import { prisma } from '@/lib/prisma';
import { logAudit, getRequestInfo } from '@/lib/audit-log';
import { checkUserRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

/**
 * POST /api/auth/2fa/disable
 * Désactiver le 2FA après vérification du code (admins uniquement)
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const user = await requireAdmin();

    // Rate limiting
    const rateLimitCheck = checkUserRateLimit(user.id, RATE_LIMITS.TWO_FACTOR);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${rateLimitCheck.retryAfter} secondes.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Code de vérification requis' },
        { status: 400 }
      );
    }

    // Récupérer le secret 2FA de l'utilisateur
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!currentUser?.twoFactorEnabled || !currentUser.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Le 2FA n\'est pas activé' },
        { status: 400 }
      );
    }

    // Déchiffrer et vérifier le code
    const secret = decryptSecret(currentUser.twoFactorSecret);
    const isValid = verifyToken(token, secret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Code de vérification invalide' },
        { status: 401 }
      );
    }

    // Désactiver le 2FA et supprimer le secret
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestInfo(request);
    await logAudit({
      userId: user.id,
      action: 'TWO_FACTOR_DISABLE',
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: '2FA désactivé avec succès',
    });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la désactivation du 2FA' },
      { status: error.message?.includes('admin') ? 403 : 500 }
    );
  }
}
