/**
 * Rate Limiter
 *
 * Protection simple contre les abus avec stockage en mémoire
 * basée sur les adresses IP
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.store = new Map();
    // Nettoyage automatique toutes les 10 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * Vérifie si une requête est autorisée
   * @param identifier Identifiant unique (IP, user ID, etc.)
   * @param maxRequests Nombre maximum de requêtes
   * @param windowMs Fenêtre de temps en millisecondes
   * @returns true si la requête est autorisée, false sinon
   */
  check(identifier: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // Pas d'entrée ou entrée expirée
    if (!entry || now > entry.resetTime) {
      this.store.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true };
    }

    // Limite atteinte
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000); // en secondes
      return { allowed: false, retryAfter };
    }

    // Incrémenter le compteur
    entry.count++;
    return { allowed: true };
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Réinitialise un identifiant spécifique
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Nettoie et arrête le nettoyage automatique
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Instance globale unique (singleton)
const rateLimiter = new RateLimiter();

export default rateLimiter;

// Configuration des limites par type d'endpoint
export const RATE_LIMITS = {
  // Authentification : limites strictes
  LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  SIGNUP: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 heure
  },
  // API : limites plus souples
  REVIEW: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  IMPORT: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 heure
  },
  // Endpoints critiques (user-based)
  UPLOAD: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 heure
  },
  ADMIN_DELETE: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 heure
  },
};

/**
 * Extrait l'adresse IP d'une requête
 * Supporte les headers x-forwarded-for (proxy/load balancer)
 */
export function getClientIp(request: Request): string {
  // Vérifier les headers de proxy
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Prendre la première IP de la liste
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback (ne devrait pas arriver en production)
  return 'unknown';
}

/**
 * Helper pour rate limiting par user ID (plus robuste que par IP)
 * Utilisation : checkUserRateLimit(userId, RATE_LIMITS.UPLOAD)
 */
export function checkUserRateLimit(
  userId: string,
  config: { maxRequests: number; windowMs: number }
): { allowed: boolean; retryAfter?: number } {
  const identifier = `user:${userId}`;
  return rateLimiter.check(identifier, config.maxRequests, config.windowMs);
}

/**
 * Helper pour rate limiting combiné (IP + userId si disponible)
 * Plus sécurisé : limite à la fois par IP et par user
 */
export function checkCombinedRateLimit(
  request: Request,
  userId: string | null,
  config: { maxRequests: number; windowMs: number }
): { allowed: boolean; retryAfter?: number } {
  const ip = getClientIp(request);

  // Check IP d'abord
  const ipCheck = rateLimiter.check(`ip:${ip}`, config.maxRequests, config.windowMs);
  if (!ipCheck.allowed) {
    return ipCheck;
  }

  // Si userId disponible, check aussi par user
  if (userId) {
    const userCheck = rateLimiter.check(`user:${userId}`, config.maxRequests, config.windowMs);
    if (!userCheck.allowed) {
      return userCheck;
    }
  }

  return { allowed: true };
}
