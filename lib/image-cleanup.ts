/**
 * Bibliothèque centralisée pour la gestion du nettoyage des images
 * Gère la suppression des images Vercel Blob et fichiers locaux avec protection
 */

import { del } from '@vercel/blob';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { prisma } from './prisma';

// ⚠️ DECKS PROTÉGÉS - NE PAS SUPPRIMER LES IMAGES DE CES DECKS
const PROTECTED_DECK_IDS = new Set<string>(['cmihzclpy0001kz04na13ywd3']); // "Images gestion orga"

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'cards');

/**
 * Vérifie si une image appartient à un deck protégé
 * @param imagePath - Chemin ou URL de l'image
 * @returns true si l'image appartient à un deck protégé, false sinon
 */
export async function isImageFromProtectedDeck(imagePath: string): Promise<boolean> {
  if (!imagePath) return false;

  try {
    const card = await prisma.card.findFirst({
      where: {
        OR: [
          { frontImage: imagePath },
          { backImage: imagePath }
        ]
      },
      include: {
        deck: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (card && PROTECTED_DECK_IDS.has(card.deckId)) {
      console.warn(`[PROTECTION] ⚠️  Image ${imagePath} appartient au deck protégé: "${card.deck.name}" (${card.deckId})`);
      console.warn(`[PROTECTION] ❌ Suppression bloquée pour des raisons de sécurité`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PROTECTION] Erreur lors de la vérification de protection:', error);
    // En cas d'erreur, on bloque par sécurité
    return true;
  }
}

/**
 * Supprime une image de manière asynchrone (Vercel Blob ou fichier local)
 * @param imagePath - Chemin ou URL de l'image à supprimer
 * @returns Promise<boolean> - true si suppression réussie, false sinon
 */
export async function deleteImageAsync(imagePath: string): Promise<boolean> {
  if (!imagePath) {
    return true; // Pas d'image à supprimer
  }

  // Vérifier la protection
  const isProtected = await isImageFromProtectedDeck(imagePath);
  if (isProtected) {
    console.log(`[CLEANUP] 🛡️  Image protégée, suppression ignorée: ${imagePath}`);
    return false;
  }

  try {
    // Cas 1 : URL Vercel Blob (HTTPS)
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // Nettoyer les query params (cache busting) avant la suppression
      const cleanUrl = imagePath.split('?')[0];
      await del(cleanUrl);
      console.log(`[CLEANUP] ✅ Image Vercel Blob supprimée: ${imagePath}`);
      return true;
    }

    // Cas 2 : Fichier local
    if (imagePath.startsWith('/uploads/cards/')) {
      const filename = imagePath.replace('/uploads/cards/', '');
      const filepath = join(UPLOAD_DIR, filename);
      await unlink(filepath);
      console.log(`[CLEANUP] ✅ Fichier local supprimé: ${imagePath}`);
      return true;
    }

    console.warn(`[CLEANUP] ⚠️  Format d'image non reconnu: ${imagePath}`);
    return false;

  } catch (error) {
    console.error(`[CLEANUP] ❌ Erreur lors de la suppression de ${imagePath}:`, error);

    // Ajouter l'image à la queue des orphelins
    await addToOrphanQueue(imagePath, error);

    return false;
  }
}

/**
 * Supprime plusieurs images en batch de manière asynchrone
 * @param imagePaths - Tableau de chemins/URLs d'images à supprimer
 * @param batchSize - Nombre d'images à traiter en parallèle (par défaut 5)
 */
export async function deleteImagesAsync(
  imagePaths: string[],
  batchSize: number = 5
): Promise<void> {
  if (!imagePaths || imagePaths.length === 0) {
    return;
  }

  // Filtrer les valeurs nulles/undefined
  const validPaths = imagePaths.filter(path => path && path.trim().length > 0);

  if (validPaths.length === 0) {
    return;
  }

  console.log(`[CLEANUP] 🧹 Démarrage du nettoyage de ${validPaths.length} image(s)...`);

  // Traiter par batch pour éviter de surcharger
  for (let i = 0; i < validPaths.length; i += batchSize) {
    const batch = validPaths.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(imagePath => deleteImageAsync(imagePath))
    );

    // Petit délai entre les batches pour ne pas surcharger l'API Vercel Blob
    if (i + batchSize < validPaths.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[CLEANUP] ✨ Nettoyage terminé`);
}

/**
 * Ajoute une image à la queue des orphelins en cas d'échec de suppression
 * @param imagePath - Chemin de l'image qui n'a pas pu être supprimée
 * @param error - Erreur rencontrée
 */
export async function addToOrphanQueue(
  imagePath: string,
  error: any
): Promise<void> {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await prisma.orphanedImage.upsert({
      where: { imagePath },
      create: {
        imagePath,
        retryCount: 0,
        lastError: errorMessage
      },
      update: {
        retryCount: {
          increment: 1
        },
        lastError: errorMessage
      }
    });

    console.log(`[CLEANUP] 📝 Image ajoutée à la queue des orphelins: ${imagePath}`);
  } catch (queueError) {
    console.error(`[CLEANUP] ⚠️  Impossible d'ajouter à la queue:`, queueError);
  }
}

/**
 * Récupère les images orphelines à retry
 * @param maxRetryCount - Nombre maximum de tentatives (par défaut 3)
 * @returns Liste des images orphelines
 */
export async function getOrphanedImages(maxRetryCount: number = 3) {
  return await prisma.orphanedImage.findMany({
    where: {
      retryCount: {
        lt: maxRetryCount
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
}

/**
 * Marque une image orpheline comme supprimée avec succès
 * @param imagePath - Chemin de l'image supprimée
 */
export async function markOrphanAsDeleted(imagePath: string): Promise<void> {
  try {
    await prisma.orphanedImage.delete({
      where: { imagePath }
    });
    console.log(`[CLEANUP] ✅ Image retirée de la queue des orphelins: ${imagePath}`);
  } catch (error) {
    console.error(`[CLEANUP] ⚠️  Erreur lors du retrait de la queue:`, error);
  }
}

/**
 * Vérifie si un deck est protégé
 * @param deckId - ID du deck à vérifier
 * @returns true si le deck est protégé, false sinon
 */
export function isProtectedDeck(deckId: string): boolean {
  return PROTECTED_DECK_IDS.has(deckId);
}

/**
 * Obtient la liste des IDs de decks protégés
 * @returns Set d'IDs de decks protégés
 */
export function getProtectedDeckIds(): Set<string> {
  return new Set(PROTECTED_DECK_IDS);
}
