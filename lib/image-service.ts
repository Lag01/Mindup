/**
 * Service pour gérer l'upload et la suppression d'images
 * Centralise la logique dupliquée dans add/edit pages
 */

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Uploader une image pour une carte
 * @param file - Le fichier image à uploader
 * @returns Résultat avec le chemin de l'image uploadée
 */
export async function uploadCardImage(file: File): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload/card-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur lors de l\'upload');
    }

    const data = await response.json();
    return {
      success: true,
      path: data.path,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Supprimer une image de carte
 * @param imagePath - Le chemin de l'image à supprimer
 * @returns Résultat de la suppression
 */
export async function deleteCardImage(imagePath: string): Promise<DeleteResult> {
  try {
    const response = await fetch('/api/upload/delete-card-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePath }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur lors de la suppression');
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Supprimer une image de manière silencieuse (sans erreur si échoue)
 * Utile lors de la création de cartes où on veut supprimer l'ancienne image
 * sans bloquer l'opération principale
 */
export async function deleteCardImageSilent(imagePath: string | null): Promise<void> {
  if (!imagePath) return;

  try {
    await deleteCardImage(imagePath);
  } catch (error) {
    // Ignorer les erreurs de suppression (l'image sera nettoyée par le cron)
    console.warn('Silent delete failed:', error);
  }
}

/**
 * Ajoute un paramètre de cache busting à une URL d'image
 * @param imagePath - URL ou chemin de l'image
 * @param timestamp - Timestamp optionnel (par défaut: Date.now())
 * @returns URL avec cache busting
 */
export function addCacheBusting(
  imagePath: string | null,
  timestamp?: number
): string | null {
  if (!imagePath) return null;

  const cb = timestamp || Date.now();
  const separator = imagePath.includes('?') ? '&' : '?';
  return `${imagePath}${separator}cb=${cb}`;
}

/**
 * Nettoie les paramètres de cache busting d'une URL
 * Utile pour comparaisons ou stockage
 * @param imagePath - URL avec potentiellement du cache busting
 * @returns URL propre
 */
export function cleanCacheBusting(imagePath: string | null): string | null {
  if (!imagePath) return null;

  // Retirer tous les query params de cache busting
  return imagePath.split('?')[0].split('&cb=')[0];
}

/**
 * Valider un fichier image
 * @param file - Le fichier à valider
 * @param maxSizeMB - Taille maximale en MB (par défaut 5MB)
 * @returns true si valide, sinon message d'erreur
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { valid: true } | { valid: false; error: string } {
  // Vérifier le type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.',
    };
  }

  // Vérifier la taille
  const maxSize = maxSizeMB * 1024 * 1024; // Convertir en bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `L'image est trop grande (max ${maxSizeMB}MB)`,
    };
  }

  return { valid: true };
}
