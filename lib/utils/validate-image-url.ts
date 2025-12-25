const ALLOWED_DOMAINS = ['blob.vercel-storage.com'];

export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return true; // Null/undefined OK (image optionnelle)

  // URLs locales
  if (url.startsWith('/uploads/cards/')) {
    // Format: /uploads/cards/filename.ext
    return /^\/uploads\/cards\/[\w-]+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }

  // URLs externes
  try {
    const parsed = new URL(url);

    // HTTPS uniquement (pas de HTTP)
    if (parsed.protocol !== 'https:') return false;

    // Domaine whitelisté
    const isAllowed = ALLOWED_DOMAINS.some(d =>
      parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)
    );
    if (!isAllowed) return false;

    // Extension valide - gère les URLs Vercel Blob avec suffixe aléatoire
    const pathname = parsed.pathname.toLowerCase();

    // Regex pour extraire l'extension AVANT un éventuel suffixe Blob (format: .ext-RANDOM)
    // Exemple: /cards/image.jpeg-abc123 → détecte "jpeg" avant le suffixe "-abc123"
    const blobMatch = pathname.match(/\.(jpg|jpeg|png|gif|webp)(?:-[a-z0-9]+)?$/i);
    if (blobMatch) {
      return true; // Extension valide trouvée
    }

    // Fallback: extraction classique pour URLs sans suffixe
    const ext = pathname.split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  } catch {
    // URL invalide
    return false;
  }
}
