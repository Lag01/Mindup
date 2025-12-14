import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAdmin } from '@/lib/auth';
import { generateSecret, generateOtpauthUrl, generateQRCode, encryptSecret } from '@/lib/two-factor';
import { prisma } from '@/lib/prisma';
import { logAudit, getRequestInfo } from '@/lib/audit-log';
import { checkUserRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

/**
 * POST /api/auth/2fa/setup
 * Générer un QR code pour configurer le 2FA (admins uniquement)
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

    // Vérifier si 2FA déjà activé
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    });

    if (currentUser?.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Le 2FA est déjà activé. Désactivez-le d\'abord si vous voulez le reconfigurer.' },
        { status: 400 }
      );
    }

    // Générer un nouveau secret
    const secret = generateSecret();
    const encryptedSecret = encryptSecret(secret);

    // Générer l'URL otpauth et le QR code
    const otpauthUrl = generateOtpauthUrl(user.email, secret);
    const qrCodeDataUrl = await generateQRCode(otpauthUrl);

    // Sauvegarder temporairement le secret (non activé)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: false, // Pas encore activé
      },
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataUrl,
      secret, // Afficher le secret en clair une seule fois (backup manuel)
    });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la configuration du 2FA' },
      { status: error.message?.includes('admin') ? 403 : 500 }
    );
  }
}
