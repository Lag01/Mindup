/**
 * Tâche CRON pour le nettoyage automatique des images orphelines
 * Exécutée quotidiennement à 2h du matin
 *
 * Cette route tente de supprimer les images dont la suppression a échoué précédemment
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getOrphanedImages,
  deleteImageAsync,
  markOrphanAsDeleted
} from '@/lib/image-cleanup';
import { prisma } from '@/lib/prisma';
import { verifyBearerToken } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification Vercel Cron (sécurité renforcée anti timing-attack)
    const authHeader = request.headers.get('authorization');
    const isAuthorized = verifyBearerToken(authHeader, process.env.CRON_SECRET);

    if (!isAuthorized) {
      console.error('[CRON] Tentative d\'accès non autorisée à la tâche de nettoyage');
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    console.log('[CRON] 🧹 Démarrage de la tâche de nettoyage des images orphelines...');

    // Récupérer les images orphelines avec moins de 3 tentatives
    const orphanedImages = await getOrphanedImages(3);

    if (orphanedImages.length === 0) {
      console.log('[CRON] ✨ Aucune image orpheline à nettoyer');
      return NextResponse.json({
        success: true,
        message: 'Aucune image orpheline à nettoyer',
        processed: 0,
        deleted: 0,
        failed: 0
      });
    }

    console.log(`[CRON] 📝 ${orphanedImages.length} image(s) orpheline(s) trouvée(s)`);

    let deleted = 0;
    let failed = 0;

    // Traiter chaque image
    for (const orphanedImage of orphanedImages) {
      try {
        console.log(`[CRON] Tentative ${orphanedImage.retryCount + 1}/3 pour image ID: ${orphanedImage.id}`);

        // Tenter de supprimer l'image
        const success = await deleteImageAsync(orphanedImage.imagePath);

        if (success) {
          // Suppression réussie, retirer de la queue
          await markOrphanAsDeleted(orphanedImage.imagePath);
          deleted++;
          console.log(`[CRON] ✅ Image ID ${orphanedImage.id} supprimée avec succès`);
        } else {
          // Échec, incrémenter le compteur
          await prisma.orphanedImage.update({
            where: { id: orphanedImage.id },
            data: {
              retryCount: {
                increment: 1
              },
              lastError: 'Échec de suppression via CRON'
            }
          });
          failed++;
          console.log(`[CRON] ❌ Échec de suppression pour image ID: ${orphanedImage.id}`);
        }

        // Petit délai entre les suppressions pour ne pas surcharger
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[CRON] Erreur lors du traitement de l'image ID ${orphanedImage.id}:`, error);

        // Incrémenter le compteur d'erreur
        try {
          await prisma.orphanedImage.update({
            where: { id: orphanedImage.id },
            data: {
              retryCount: {
                increment: 1
              },
              lastError: error instanceof Error ? error.message : 'Erreur inconnue'
            }
          });
        } catch (updateError) {
          console.error('[CRON] Erreur lors de la mise à jour du compteur:', updateError);
        }

        failed++;
      }
    }

    // Nettoyer les entrées avec plus de 3 tentatives (abandonner)
    const abandonedImages = await prisma.orphanedImage.findMany({
      where: {
        retryCount: {
          gte: 3
        }
      }
    });

    if (abandonedImages.length > 0) {
      console.log(`[CRON] 🗑️  ${abandonedImages.length} image(s) abandonnée(s) après 3 tentatives`);

      // Garder une trace dans les logs avant suppression
      for (const img of abandonedImages) {
        console.warn(`[CRON] Image ID ${img.id} abandonnée - Dernière erreur: ${img.lastError}`);
      }

      // Supprimer les entrées abandonnées de la queue
      await prisma.orphanedImage.deleteMany({
        where: {
          retryCount: {
            gte: 3
          }
        }
      });
    }

    const result = {
      success: true,
      processed: orphanedImages.length,
      deleted,
      failed,
      abandoned: abandonedImages.length,
      timestamp: new Date().toISOString()
    };

    console.log('[CRON] ✨ Tâche de nettoyage terminée');
    console.log(`[CRON] Résumé: ${deleted} supprimée(s), ${failed} échouée(s), ${abandonedImages.length} abandonnée(s)`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[CRON] ❌ Erreur critique lors de la tâche de nettoyage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du nettoyage des images orphelines',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
