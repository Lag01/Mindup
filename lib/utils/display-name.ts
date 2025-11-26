/**
 * Génère un pseudo à partir d'un email
 * Extrait la partie avant le @
 * @param email - L'email de l'utilisateur
 * @returns Le pseudo généré
 */
export function generateDisplayNameFromEmail(email: string): string {
  const [localPart] = email.split('@');
  return localPart || email; // Fallback sur l'email si pas de @
}
