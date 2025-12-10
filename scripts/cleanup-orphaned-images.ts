/**
 * Script one-shot pour identifier et nettoyer les images orphelines existantes
 *
 * Usage:
 *   npx tsx scripts/cleanup-orphaned-images.ts --dry-run   # Mode simulation
 *   npx tsx scripts/cleanup-orphaned-images.ts             # Nettoyage réel (avec confirmation)
 *   npx tsx scripts/cleanup-orphaned-images.ts --force     # Nettoyage sans confirmation
 */

import { list } from '@vercel/blob';
import { prisma } from '../lib/prisma';
import { deleteImagesAsync, isImageFromProtectedDeck } from '../lib/image-cleanup';

// Arguments en ligne de commande
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

interface OrphanedImageInfo {
  url: string;
  size: number;
  uploadedAt: Date;
  isProtected: boolean;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧹 Script de nettoyage des images orphelines Vercel Blob');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('📋 MODE SIMULATION : Aucune image ne sera supprimée\n');
  }

  try {
    // Étape 1 : Lister toutes les images dans Vercel Blob
    console.log('📡 Étape 1/4 : Récupération des images depuis Vercel Blob...');

    const { blobs } = await list();
    console.log(`   ✓ ${blobs.length} image(s) trouvée(s) dans Vercel Blob\n`);

    if (blobs.length === 0) {
      console.log('✨ Aucune image dans Vercel Blob. Rien à nettoyer.');
      return;
    }

    // Étape 2 : Récupérer toutes les URLs d'images de la base de données
    console.log('💾 Étape 2/4 : Récupération des images référencées en base de données...');

    const cards = await prisma.card.findMany({
      select: {
        frontImage: true,
        backImage: true
      }
    });

    // Créer un Set de toutes les URLs utilisées
    const usedImageUrls = new Set<string>();
    cards.forEach(card => {
      if (card.frontImage) usedImageUrls.add(card.frontImage);
      if (card.backImage) usedImageUrls.add(card.backImage);
    });

    console.log(`   ✓ ${usedImageUrls.size} image(s) référencée(s) en base de données\n`);

    // Étape 3 : Identifier les images orphelines
    console.log('🔍 Étape 3/4 : Identification des images orphelines...');

    const orphanedImages: OrphanedImageInfo[] = [];
    let totalSize = 0;

    for (const blob of blobs) {
      if (!usedImageUrls.has(blob.url)) {
        // Vérifier si l'image appartient à un deck protégé
        const isProtected = await isImageFromProtectedDeck(blob.url);

        orphanedImages.push({
          url: blob.url,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
          isProtected
        });

        if (!isProtected) {
          totalSize += blob.size;
        }
      }
    }

    const orphanedCount = orphanedImages.filter(img => !img.isProtected).length;
    const protectedCount = orphanedImages.filter(img => img.isProtected).length;

    console.log(`   ✓ ${orphanedCount} image(s) orpheline(s) trouvée(s)`);

    if (protectedCount > 0) {
      console.log(`   🛡️  ${protectedCount} image(s) protégée(s) (deck "Images gestion orga")\n`);
    } else {
      console.log();
    }

    if (orphanedCount === 0) {
      console.log('✨ Aucune image orpheline à nettoyer !');
      if (protectedCount > 0) {
        console.log(`   (${protectedCount} image(s) protégée(s) ignorée(s))`);
      }
      return;
    }

    // Afficher les détails
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 Résumé des images orphelines :');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Nombre d'images orphelines : ${orphanedCount}`);
    console.log(`   Images protégées (ignorées) : ${protectedCount}`);
    console.log(`   Taille totale à libérer : ${formatBytes(totalSize)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Afficher la liste des images
    console.log('📋 Liste des images orphelines :\n');

    let index = 1;
    for (const img of orphanedImages) {
      if (img.isProtected) {
        console.log(`   ${index}. 🛡️  [PROTÉGÉ] ${img.url}`);
        console.log(`      ${formatBytes(img.size)} - Uploadée le ${img.uploadedAt.toLocaleDateString()}`);
      } else {
        console.log(`   ${index}. ${img.url}`);
        console.log(`      ${formatBytes(img.size)} - Uploadée le ${img.uploadedAt.toLocaleDateString()}`);
      }
      index++;
    }
    console.log();

    // Mode dry-run : arrêter ici
    if (isDryRun) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📋 MODE SIMULATION : Aucune suppression effectuée');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`\n💡 Pour effectuer le nettoyage réel, exécutez :`);
      console.log(`   npx tsx scripts/cleanup-orphaned-images.ts\n`);
      return;
    }

    // Étape 4 : Confirmation et nettoyage
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⚠️  ATTENTION : Suppression définitive');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (!isForce) {
      // Demander confirmation interactive
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>(resolve => {
        rl.question(`Voulez-vous supprimer ${orphanedCount} image(s) orpheline(s) ? (oui/non) : `, resolve);
      });

      rl.close();

      if (answer.toLowerCase() !== 'oui') {
        console.log('\n❌ Nettoyage annulé par l\'utilisateur\n');
        return;
      }
    }

    console.log('\n🧹 Étape 4/4 : Suppression des images orphelines...\n');

    // Filtrer les images protégées
    const imagesToDelete = orphanedImages
      .filter(img => !img.isProtected)
      .map(img => img.url);

    // Supprimer les images
    await deleteImagesAsync(imagesToDelete, 3);

    console.log();
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Nettoyage terminé avec succès !');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   ${orphanedCount} image(s) supprimée(s)`);
    if (protectedCount > 0) {
      console.log(`   ${protectedCount} image(s) protégée(s) conservée(s)`);
    }
    console.log(`   ${formatBytes(totalSize)} d'espace libéré`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Erreur lors du nettoyage :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Formate une taille en octets de manière lisible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Exécuter le script
main();
