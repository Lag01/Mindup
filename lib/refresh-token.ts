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
 * Nettoyer les tokens expirés (à exécuter périodiquement).
 * Z7-12 : suppression par batches de 10 000 pour éviter qu'un cleanup tardif
 * (grosse volumétrie de tokens expirés accumulés) ne tienne une transaction
 * Postgres pendant plusieurs secondes / minutes.
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const BATCH_SIZE = 10000;
  const MAX_BATCHES = 100; // garde-fou : 100 × 10k = 1M tokens max par run
  const now = new Date();
  let total = 0;

  for (let i = 0; i < MAX_BATCHES; i++) {
    const deleted = await prisma.$executeRaw`
      DELETE FROM "RefreshToken"
      WHERE id IN (
        SELECT id FROM "RefreshToken"
        WHERE "expiresAt" < ${now}
        LIMIT ${BATCH_SIZE}
      )
    `;
    const count = Number(deleted);
    total += count;
    if (count < BATCH_SIZE) break;
  }

  return total;
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
