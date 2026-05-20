/**
 * Génère un pseudo à partir d'un email.
 * - Extrait la partie avant le @
 * - Conserve uniquement lettres (unicode), chiffres, "." "_" "-"
 * - Trim + limite à 50 caractères
 * - Fallback "Utilisateur" si la partie locale ne donne rien d'exploitable
 */
export function generateDisplayNameFromEmail(email: string): string {
  const [localPart = ''] = (email || '').split('@');
  const sanitized = localPart
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '')
    .trim()
    .slice(0, 50);
  return sanitized || 'Utilisateur';
}
