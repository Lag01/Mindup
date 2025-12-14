import { prisma } from './prisma';
import crypto from 'crypto';

const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Génère un refresh token aléatoire et sécurisé
 */
function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Hash un refresh token pour stockage sécurisé
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Créer un nouveau refresh token pour un utilisateur
 */
export async function createRefreshToken(userId: string): Promise<string> {
  const token = generateRefreshToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

  await prisma.refreshToken.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt,
    },
  });

  return token; // Retourner le token en clair (une seule fois)
}

/**
 * Vérifier et valider un refresh token
 */
export async function verifyRefreshToken(
  token: string
): Promise<{ valid: boolean; userId?: string }> {
  const hashedToken = hashToken(token);

  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token: hashedToken },
  });

  if (!refreshToken) {
    return { valid: false };
  }

  // Vérifier l'expiration
  if (refreshToken.expiresAt < new Date()) {
    // Token expiré, le supprimer
    await prisma.refreshToken.delete({
      where: { id: refreshToken.id },
    });
    return { valid: false };
  }

  return { valid: true, userId: refreshToken.userId };
}

/**
 * Révoquer un refresh token spécifique
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const hashedToken = hashToken(token);

  await prisma.refreshToken.deleteMany({
    where: { token: hashedToken },
  });
}

/**
 * Révoquer tous les refresh tokens d'un utilisateur
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

/**
 * Nettoyer les tokens expirés (à exécuter périodiquement)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

/**
 * Rotation de token : invalider l'ancien et créer un nouveau
 */
export async function rotateRefreshToken(
  oldToken: string
): Promise<{ success: boolean; newToken?: string }> {
  const verification = await verifyRefreshToken(oldToken);

  if (!verification.valid || !verification.userId) {
    return { success: false };
  }

  // Révoquer l'ancien
  await revokeRefreshToken(oldToken);

  // Créer un nouveau
  const newToken = await createRefreshToken(verification.userId);

  return { success: true, newToken };
}
