/**
 * Logique de synchronisation des decks publics
 *
 * Ce fichier contient toutes les fonctions nécessaires pour gérer
 * l'importation et la synchronisation des decks publics.
 */

import { prisma } from '@/lib/prisma';
import { deleteImagesAsync } from '@/lib/image-cleanup';

/**
 * Importe un deck public dans le profil d'un utilisateur
 * @param userId - ID de l'utilisateur qui importe
 * @param sourceDeckId - ID du deck public à importer
 * @returns Le deck importé
 */
export async function importPublicDeck(userId: string, sourceDeckId: string) {
  // Vérifier que le deck source est bien public
  const sourceDeck = await prisma.deck.findUnique({
    where: { id: sourceDeckId },
    include: {
      cards: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!sourceDeck) {
    throw new Error('Deck non trouvé');
  }

  if (!sourceDeck.isPublic) {
    throw new Error('Ce deck n\'est pas public');
  }

  // Vérifier que l'utilisateur n'a pas déjà importé ce deck
  const existingImport = await prisma.deck.findFirst({
    where: {
      userId,
      originalDeckId: sourceDeckId
    }
  });

  if (existingImport) {
    throw new Error('Vous avez déjà importé ce deck');
  }

  // Créer le deck importé
  const importedDeck = await prisma.deck.create({
    data: {
      name: sourceDeck.name,
      userId,
      originalDeckId: sourceDeckId,
      isPublic: false,
      cards: {
        create: sourceDeck.cards.map(card => ({
          front: card.front,
          back: card.back,
          frontType: card.frontType,
          backType: card.backType,
          order: card.order,
          reviews: {
            create: {
              userId,
              reps: 0,
              againCount: 0,
              hardCount: 0,
              goodCount: 0,
              easyCount: 0
            }
          }
        }))
      }
    },
    include: {
      cards: true
    }
  });

  // Incrémenter le compteur d'importations du deck source
  await prisma.deck.update({
    where: { id: sourceDeckId },
    data: {
      importCount: {
        increment: 1
      }
    }
  });

  return importedDeck;
}

/**
 * Retire un deck importé du profil d'un utilisateur
 * @param userId - ID de l'utilisateur
 * @param importedDeckId - ID du deck importé à retirer
 */
export async function unimportPublicDeck(userId: string, importedDeckId: string) {
  // Vérifier que le deck appartient à l'utilisateur et qu'il est bien importé
  const deck = await prisma.deck.findUnique({
    where: { id: importedDeckId },
    include: {
      cards: {
        select: {
          frontImage: true,
          backImage: true
        }
      }
    }
  });

  if (!deck) {
    throw new Error('Deck non trouvé');
  }

  if (deck.userId !== userId) {
    throw new Error('Ce deck ne vous appartient pas');
  }

  if (!deck.originalDeckId) {
    throw new Error('Ce deck n\'est pas un deck importé');
  }

  const sourceDeckId = deck.originalDeckId;

  // Collecter les images avant suppression (bien que les decks importés n'aient normalement pas d'images)
  const imagesToDelete = deck.cards.flatMap(card =>
    [card.frontImage, card.backImage].filter(Boolean) as string[]
  );

  // Supprimer le deck (cascade supprime les cartes et reviews)
  await prisma.deck.delete({
    where: { id: importedDeckId }
  });

  // Nettoyage asynchrone des images (si présentes)
  if (imagesToDelete.length > 0) {
    console.log(`[CLEANUP] Nettoyage de ${imagesToDelete.length} image(s) du deck importé ${importedDeckId}`);
    deleteImagesAsync(imagesToDelete).catch(err =>
      console.error('[CLEANUP] Erreur nettoyage images deck importé:', err)
    );
  }

  // Décrémenter le compteur d'importations du deck source
  await prisma.deck.update({
    where: { id: sourceDeckId },
    data: {
      importCount: {
        decrement: 1
      }
    }
  });
}

/**
 * Synchronise tous les decks importés depuis un deck public
 * Cette fonction est appelée quand un admin modifie un deck public
 * @param sourceDeckId - ID du deck public modifié
 */
export async function syncImportedDecks(sourceDeckId: string) {
  // Récupérer le deck source avec toutes ses cartes
  const sourceDeck = await prisma.deck.findUnique({
    where: { id: sourceDeckId },
    include: {
      cards: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!sourceDeck) {
    throw new Error('Deck source non trouvé');
  }

  if (!sourceDeck.isPublic) {
    throw new Error('Le deck source n\'est pas public');
  }

  // Récupérer tous les decks importés
  const importedDecks = await prisma.deck.findMany({
    where: {
      originalDeckId: sourceDeckId
    },
    include: {
      cards: {
        include: {
          reviews: true
        }
      }
    }
  });

  // Synchroniser chaque deck importé
  for (const importedDeck of importedDecks) {
    await syncSingleDeck(importedDeck.id, sourceDeck.cards, importedDeck.userId);
  }

  // Mettre à jour le nom du deck pour tous les decks importés
  await prisma.deck.updateMany({
    where: {
      originalDeckId: sourceDeckId
    },
    data: {
      name: sourceDeck.name
    }
  });
}

/**
 * Synchronise un seul deck importé avec sa source
 * @param importedDeckId - ID du deck importé
 * @param sourceCards - Cartes du deck source
 * @param userId - ID de l'utilisateur propriétaire du deck importé
 */
async function syncSingleDeck(
  importedDeckId: string,
  sourceCards: Array<{
    id: string;
    front: string;
    back: string;
    frontType: any;
    backType: any;
    order: number;
  }>,
  userId: string
) {
  // Récupérer les cartes actuelles du deck importé
  const currentCards = await prisma.card.findMany({
    where: { deckId: importedDeckId },
    include: {
      reviews: true
    }
  });

  // Créer un map des cartes actuelles par ordre
  const currentCardsMap = new Map(
    currentCards.map(card => [card.order, card])
  );

  // Créer un map des cartes sources par ordre
  const sourceCardsMap = new Map(
    sourceCards.map(card => [card.order, card])
  );

  // Identifier les cartes à ajouter, modifier et supprimer
  const cardsToAdd: typeof sourceCards = [];
  const cardsToUpdate: Array<{ currentCard: typeof currentCards[0], sourceCard: typeof sourceCards[0] }> = [];
  const cardsToDelete: typeof currentCards = [];

  // Vérifier chaque carte source
  for (const sourceCard of sourceCards) {
    const currentCard = currentCardsMap.get(sourceCard.order);

    if (!currentCard) {
      // Carte à ajouter
      cardsToAdd.push(sourceCard);
    } else {
      // Vérifier si la carte a été modifiée
      if (
        currentCard.front !== sourceCard.front ||
        currentCard.back !== sourceCard.back ||
        currentCard.frontType !== sourceCard.frontType ||
        currentCard.backType !== sourceCard.backType
      ) {
        cardsToUpdate.push({ currentCard, sourceCard });
      }
    }
  }

  // Identifier les cartes à supprimer (présentes dans currentCards mais pas dans sourceCards)
  for (const currentCard of currentCards) {
    if (!sourceCardsMap.has(currentCard.order)) {
      cardsToDelete.push(currentCard);
    }
  }

  // Collecter les images des cartes à supprimer
  const imagesToDelete = cardsToDelete.flatMap(card =>
    [card.frontImage, card.backImage].filter(Boolean) as string[]
  );

  // Exécuter les modifications dans une transaction
  await prisma.$transaction(async (tx) => {
    // Supprimer les cartes obsolètes
    if (cardsToDelete.length > 0) {
      await tx.card.deleteMany({
        where: {
          id: {
            in: cardsToDelete.map(c => c.id)
          }
        }
      });
    }

    // Mettre à jour les cartes modifiées
    for (const { currentCard, sourceCard } of cardsToUpdate) {
      await tx.card.update({
        where: { id: currentCard.id },
        data: {
          front: sourceCard.front,
          back: sourceCard.back,
          frontType: sourceCard.frontType,
          backType: sourceCard.backType
        }
      });
    }

    // Ajouter les nouvelles cartes
    for (const sourceCard of cardsToAdd) {
      await tx.card.create({
        data: {
          deckId: importedDeckId,
          front: sourceCard.front,
          back: sourceCard.back,
          frontType: sourceCard.frontType,
          backType: sourceCard.backType,
          order: sourceCard.order,
          reviews: {
            create: {
              userId,
              reps: 0,
              againCount: 0,
              hardCount: 0,
              goodCount: 0,
              easyCount: 0
            }
          }
        }
      });
    }
  });

  // Nettoyage asynchrone des images des cartes supprimées
  if (imagesToDelete.length > 0) {
    console.log(`[CLEANUP] Nettoyage de ${imagesToDelete.length} image(s) lors de la synchronisation du deck ${importedDeckId}`);
    deleteImagesAsync(imagesToDelete).catch(err =>
      console.error('[CLEANUP] Erreur nettoyage images synchronisation:', err)
    );
  }
}

/**
 * Dépublie un deck et supprime tous les decks importés
 * @param deckId - ID du deck à dépublier
 */
export async function unpublishDeck(deckId: string) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId }
  });

  if (!deck) {
    throw new Error('Deck non trouvé');
  }

  if (!deck.isPublic) {
    throw new Error('Ce deck n\'est pas public');
  }

  // Récupérer tous les decks importés avec leurs images
  const importedDecks = await prisma.deck.findMany({
    where: {
      originalDeckId: deckId
    },
    include: {
      cards: {
        select: {
          frontImage: true,
          backImage: true
        }
      }
    }
  });

  // Collecter toutes les images de tous les decks importés
  const allImagesToDelete = importedDecks.flatMap(importedDeck =>
    importedDeck.cards.flatMap(card =>
      [card.frontImage, card.backImage].filter(Boolean) as string[]
    )
  );

  // Supprimer tous les decks importés (cascade supprime cartes et reviews)
  await prisma.deck.deleteMany({
    where: {
      originalDeckId: deckId
    }
  });

  // Nettoyage asynchrone de toutes les images des decks importés
  if (allImagesToDelete.length > 0) {
    console.log(`[CLEANUP] Nettoyage de ${allImagesToDelete.length} image(s) des decks importés lors de la dépublication`);
    deleteImagesAsync(allImagesToDelete).catch(err =>
      console.error('[CLEANUP] Erreur nettoyage images dépublication:', err)
    );
  }

  // Marquer le deck comme non public et réinitialiser le compteur
  await prisma.deck.update({
    where: { id: deckId },
    data: {
      isPublic: false,
      importCount: 0
    }
  });
}
