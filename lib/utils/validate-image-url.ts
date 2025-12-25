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

    // LOG POUR DÉBOGAGE - Voir les détails de l'URL
    console.log('[Validate Image URL] Détails:', {
      fullUrl: url,
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      isHttps: parsed.protocol === 'https:',
      isAllowedDomain: ALLOWED_DOMAINS.some(d =>
        parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)
      )
    });

    // HTTPS uniquement (pas de HTTP)
    if (parsed.protocol !== 'https:') {
      console.error('[Validate Image URL] Rejeté: Protocol non HTTPS:', parsed.protocol);
      return false;
    }

    // Domaine whitelisté
    const isAllowed = ALLOWED_DOMAINS.some(d =>
      parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)
    );
    if (!isAllowed) {
      console.error('[Validate Image URL] Rejeté: Domaine non autorisé:', parsed.hostname);
      return false;
    }

    // Extension valide - gère les URLs Vercel Blob avec suffixe aléatoire
    const pathname = parsed.pathname.toLowerCase();

    // Regex pour extraire l'extension AVANT un éventuel suffixe Blob (format: .ext-RANDOM)
    // Exemple: /cards/image.jpeg-abc123 → détecte "jpeg" avant le suffixe "-abc123"
    const blobMatch = pathname.match(/\.(jpg|jpeg|png|gif|webp)(?:-[a-z0-9]+)?$/i);
    if (blobMatch) {
      console.log('[Validate Image URL] Accepté via regex Blob');
      return true; // Extension valide trouvée
    }

    // Fallback: extraction classique pour URLs sans suffixe
    const ext = pathname.split('.').pop();
    const isValidExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'blob'].includes(ext || '');

    if (!isValidExt) {
      console.error('[Validate Image URL] Rejeté: Extension invalide:', ext, 'pathname:', pathname);
    } else {
      console.log('[Validate Image URL] Accepté via fallback classique');
    }

    return isValidExt;
  } catch (error) {
    // URL invalide
    console.error('[Validate Image URL] Exception:', error, 'URL:', url);
    return false;
  }
}
