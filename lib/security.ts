/**
 * Fonctions de sécurité réutilisables
 *
 * Ce module centralise les fonctions de sécurité critiques
 * pour éviter les vulnérabilités courantes (timing attacks, etc.)
 */

import { timingSafeEqual } from 'crypto';

/**
 * Vérifie un Bearer token de manière sécurisée (constant-time comparison)
 *
 * Utilise timingSafeEqual pour éviter les timing attacks qui permettraient
 * à un attaquant de deviner le token caractère par caractère en mesurant
 * le temps de réponse.
 *
 * @param authHeader - Header Authorization complet (e.g., "Bearer abc123")
 * @param expectedToken - Token attendu (sans le préfixe "Bearer ")
 * @returns true si le token est valide, false sinon
 *
 * @example
 * ```typescript
 * const authHeader = request.headers.get('authorization');
 * const isValid = verifyBearerToken(authHeader, process.env.CRON_SECRET);
 * if (!isValid) {
 *   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
 * }
 * ```
 */
export function verifyBearerToken(
  authHeader: string | null,
  expectedToken: string | undefined
): boolean {
  // Vérifier que le header existe et commence par "Bearer "
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  // Extraire le token (retirer le préfixe "Bearer ")
  const token = authHeader.slice(7);

  // Vérifier que le token attendu existe
  if (!expectedToken) {
    return false;
  }

  // Vérifier que les longueurs correspondent (sinon timingSafeEqual échoue)
  if (token.length !== expectedToken.length) {
    return false;
  }

  try {
    // Comparaison constant-time pour éviter timing attacks
    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expectedToken);

    return timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch (error) {
    // timingSafeEqual peut lancer une erreur si les buffers n'ont pas la même taille
    // (normalement déjà vérifié, mais par sécurité)
    console.error('[Security] Erreur lors de la vérification du token:', error);
    return false;
  }
}

/**
 * Valide qu'une URL d'image est sécurisée (HTTPS uniquement)
 *
 * @param url - URL à valider
 * @param allowedHostnames - Liste des hostnames autorisés (par défaut Vercel Blob)
 * @returns true si l'URL est valide et sécurisée, false sinon
 *
 * @example
 * ```typescript
 * const isValid = validateImageUrl(
 *   'https://abc.public.blob.vercel-storage.com/image.jpg'
 * );
 * ```
 */
export function validateImageUrl(
  url: string,
  allowedHostnames: string[] = ['.public.blob.vercel-storage.com']
): boolean {
  try {
    const parsed = new URL(url);

    // Vérifier protocole HTTPS uniquement
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Vérifier que le hostname est autorisé
    const isAllowedHostname = allowedHostnames.some(allowedHost => {
      if (allowedHost.startsWith('.')) {
        // Wildcard: vérifier que le hostname se termine par le pattern
        return parsed.hostname.endsWith(allowedHost.slice(1)) ||
               parsed.hostname === allowedHost.slice(1);
      }
      // Exact match
      return parsed.hostname === allowedHost;
    });

    return isAllowedHostname;
  } catch (error) {
    // URL invalide
    return false;
  }
}
