/**
 * Script pour identifier le deck "Images gestion orga"
 * et créer un backup de ses données
 */

import { prisma } from '../lib/prisma';

async function findAndBackupDeck() {
  try {
    console.log('🔍 Recherche du deck "Images gestion orga"...\n');

    // Rechercher le deck par nom
    const deck = await prisma.deck.findFirst({
      where: {
        name: {
          contains: 'Images gestion orga',
          mode: 'insensitive'
        }
      },
      include: {
        cards: {
          orderBy: { order: 'asc' }
        },
        user: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    });

    if (!deck) {
      console.log('❌ Deck "Images gestion orga" non trouvé.');
      console.log('\n📋 Liste de tous les decks disponibles :');

      const allDecks = await prisma.deck.findMany({
        select: {
          id: true,
          name: true,
          userId: true
        }
      });

      allDecks.forEach((d, index) => {
        console.log(`${index + 1}. ${d.name} (ID: ${d.id})`);
      });

      return;
    }

    console.log('✅ Deck trouvé !');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📦 ID du deck: ${deck.id}`);
    console.log(`📝 Nom: ${deck.name}`);
    console.log(`👤 Propriétaire: ${deck.user.displayName} (${deck.user.id})`);
    console.log(`📊 Nombre de cartes: ${deck.cards.length}`);
    console.log(`🌐 Public: ${deck.isPublic ? 'Oui' : 'Non'}`);
    console.log(`🔗 Deck importé: ${deck.originalDeckId ? 'Oui' : 'Non'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Compter les images
    const imagesCount = {
      frontImages: deck.cards.filter(c => c.frontImage).length,
      backImages: deck.cards.filter(c => c.backImage).length,
      total: 0
    };

    const allImages = new Set<string>();
    deck.cards.forEach(card => {
      if (card.frontImage) allImages.add(card.frontImage);
      if (card.backImage) allImages.add(card.backImage);
    });
    imagesCount.total = allImages.size;

    console.log('📸 Statistiques des images:');
    console.log(`   - Images recto: ${imagesCount.frontImages}`);
    console.log(`   - Images verso: ${imagesCount.backImages}`);
    console.log(`   - Total d'images uniques: ${imagesCount.total}\n`);

    // Lister toutes les images
    if (imagesCount.total > 0) {
      console.log('🖼️  Liste des images:\n');
      let imageIndex = 1;
      deck.cards.forEach((card, cardIndex) => {
        if (card.frontImage || card.backImage) {
          console.log(`   Carte ${cardIndex + 1} (ID: ${card.id}):`);
          if (card.frontImage) {
            console.log(`   ${imageIndex}. [RECTO] ${card.frontImage}`);
            imageIndex++;
          }
          if (card.backImage) {
            console.log(`   ${imageIndex}. [VERSO] ${card.backImage}`);
            imageIndex++;
          }
        }
      });
      console.log();
    }

    // Créer le backup JSON
    const backup = {
      metadata: {
        backupDate: new Date().toISOString(),
        deckId: deck.id,
        deckName: deck.name,
        cardsCount: deck.cards.length,
        imagesCount: imagesCount.total
      },
      deck: {
        id: deck.id,
        name: deck.name,
        userId: deck.userId,
        isPublic: deck.isPublic,
        originalDeckId: deck.originalDeckId,
        createdAt: deck.createdAt
      },
      cards: deck.cards.map(card => ({
        id: card.id,
        order: card.order,
        front: card.front,
        back: card.back,
        frontType: card.frontType,
        backType: card.backType,
        frontImage: card.frontImage,
        backImage: card.backImage
      })),
      images: Array.from(allImages).map(url => ({
        url,
        type: url.startsWith('https://') ? 'vercel-blob' : 'local'
      }))
    };

    // Sauvegarder dans un fichier JSON
    const fs = await import('fs/promises');
    const backupPath = `./backups/deck-${deck.id}-backup-${Date.now()}.json`;

    // Créer le dossier backups s'il n'existe pas
    try {
      await fs.mkdir('./backups', { recursive: true });
    } catch (err) {
      // Le dossier existe déjà
    }

    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf-8');

    console.log(`💾 Backup créé avec succès: ${backupPath}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ PROTECTION: Ajoutez cet ID à PROTECTED_DECK_IDS:');
    console.log(`   const PROTECTED_DECK_IDS = new Set<string>(['${deck.id}']);`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAndBackupDeck();
