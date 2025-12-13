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

    // Extension valide
    const pathname = parsed.pathname.toLowerCase();
    const ext = pathname.split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  } catch {
    // URL invalide
    return false;
  }
}
