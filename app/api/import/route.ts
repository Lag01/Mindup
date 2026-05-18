import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { parseXML, parseCSV, type ParsedDeck } from '@/lib/parsers';
import { parseAPKG } from '@/lib/parsers/apkg';
import { createNewReviewStats } from '@/lib/revision';
import { getAppSettings } from '@/lib/settings';
import { syncImportedDecks } from '@/lib/sync-decks';
import { validateCardContent } from '@/lib/utils/validate-card';

// Skip les cartes invalides (LaTeX dangereux ou contenu trop long) plutôt que de planter
// l'import complet. Retourne le deck filtré + le nombre de cartes ignorées.
function sanitizeParsedDeck(deck: ParsedDeck): { deck: ParsedDeck; skipped: number } {
  let skipped = 0;
  const safeCards = deck.cards.filter((card) => {
    const v = validateCardContent(card.front, card.back, card.frontType, card.backType);
    if (!v.valid) {
      skipped++;
      return false;
    }
    return true;
  });
  return { deck: { ...deck, cards: safeCards }, skipped };
}

// Limites de taille (en octets). .apkg est binaire et peut contenir plus de cartes
// mais reste petit sans médias (~1 Mo pour 1000 cartes). 4 Mo couvre largement les
// usages standards et reste sous la limite Vercel serverless (~4.5 Mo payload).
const MAX_TEXT_SIZE = 5 * 1024 * 1024;
const MAX_APKG_SIZE = 4 * 1024 * 1024;

type MergeMode = 'split' | 'merge';

function parseSelectedDeckIds(raw: string | null): number[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    const ids = parsed
      .map((v: unknown) => Number(v))
      .filter((n: number) => Number.isFinite(n) && !Number.isNaN(n));
    return ids.length > 0 ? ids : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const settings = await getAppSettings();
    const userDecksCount = await prisma.deck.count({
      where: { userId: user.id },
    });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const preserveHistory = formData.get('preserveHistory') === 'true';
    const selectedDeckIds = parseSelectedDeckIds(
      typeof formData.get('selectedDeckIds') === 'string'
        ? (formData.get('selectedDeckIds') as string)
        : null
    );
    const mergeModeRaw = formData.get('mergeMode');
    const mergeMode: MergeMode = mergeModeRaw === 'merge' ? 'merge' : 'split';
    const mergedDeckNameRaw = formData.get('mergedDeckName');
    const mergedDeckName =
      typeof mergedDeckNameRaw === 'string' && mergedDeckNameRaw.trim()
        ? mergedDeckNameRaw.trim()
        : undefined;
    const targetDeckIdRaw = formData.get('targetDeckId');
    const targetDeckId =
      typeof targetDeckIdRaw === 'string' && targetDeckIdRaw.trim()
        ? targetDeckIdRaw.trim()
        : undefined;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fallbackName = file.name.replace(/\.[^.]+$/, '') || 'Deck importé';

    if (targetDeckId && fileExtension !== 'csv' && fileExtension !== 'xml') {
      return NextResponse.json(
        { error: 'L\'ajout à un deck existant n\'est supporté que pour les imports CSV et XML.' },
        { status: 400 }
      );
    }

    // Si on cible un deck existant, on vérifie son existence/possession/statut maintenant
    // pour échouer vite avant le parsing.
    let targetDeck: { id: string; name: string; isPublic: boolean } | null = null;
    if (targetDeckId) {
      const found = await prisma.deck.findFirst({
        where: { id: targetDeckId, userId: user.id },
        select: { id: true, name: true, isPublic: true, originalDeckId: true },
      });
      if (!found) {
        return NextResponse.json({ error: 'Deck cible introuvable' }, { status: 404 });
      }
      if (found.originalDeckId) {
        return NextResponse.json(
          {
            error:
              'Vous ne pouvez pas ajouter de cartes à un deck importé. Il est synchronisé avec le deck public.',
          },
          { status: 403 }
        );
      }
      targetDeck = { id: found.id, name: found.name, isPublic: found.isPublic };
    }

    let parsedDecks: ParsedDeck[];

    try {
      if (fileExtension === 'xml') {
        if (file.size > MAX_TEXT_SIZE) {
          return NextResponse.json(
            { error: 'Fichier XML trop volumineux (max 5 Mo)' },
            { status: 400 }
          );
        }
        parsedDecks = [parseXML(await file.text())];
      } else if (fileExtension === 'csv') {
        if (file.size > MAX_TEXT_SIZE) {
          return NextResponse.json(
            { error: 'Fichier CSV trop volumineux (max 5 Mo)' },
            { status: 400 }
          );
        }
        parsedDecks = [await parseCSV(await file.text())];
      } else if (fileExtension === 'apkg') {
        if (file.size > MAX_APKG_SIZE) {
          return NextResponse.json(
            {
              error: `Fichier .apkg trop volumineux (max ${MAX_APKG_SIZE / (1024 * 1024)} Mo). Les decks contenant des médias dépassent souvent cette limite ; cette version ignore les médias mais ne peut pas traiter de fichiers trop gros.`,
            },
            { status: 400 }
          );
        }
        parsedDecks = await parseAPKG(await file.arrayBuffer(), {
          preserveHistory,
          fallbackName,
          selectedDeckIds,
          mergeMode,
          mergedDeckName: mergeMode === 'merge' ? mergedDeckName || fallbackName : undefined,
        });
      } else {
        return NextResponse.json(
          { error: 'Format de fichier non supporté. Utilisez .apkg, .xml ou .csv' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      // Z1-07 : on log côté serveur, on expose un message générique côté client
      console.error('Import parsing error:', error?.message, error);
      return NextResponse.json(
        { error: 'Fichier invalide ou corrompu — vérifie le format puis réessaye.' },
        { status: 400 }
      );
    }

    // Z3-01 : sanitiser TOUS les decks importés (filtrer cartes LaTeX dangereuses ou trop longues)
    let totalSkipped = 0;
    parsedDecks = parsedDecks.map((d) => {
      const { deck, skipped } = sanitizeParsedDeck(d);
      totalSkipped += skipped;
      return deck;
    });
    // Si un deck devient vide après filtrage, on échoue proprement.
    if (parsedDecks.every((d) => d.cards.length === 0)) {
      return NextResponse.json(
        {
          error: `Aucune carte valide après filtrage de sécurité (${totalSkipped} carte(s) ignorée(s) car contenant des commandes LaTeX non autorisées ou trop longues).`,
        },
        { status: 400 }
      );
    }

    // Mode "ajout à un deck existant" : on ne crée pas de deck, on append des cartes.
    if (targetDeck) {
      if (parsedDecks.length !== 1) {
        return NextResponse.json(
          {
            error:
              'Plusieurs decks détectés dans le fichier, impossible de cibler un deck existant.',
          },
          { status: 400 }
        );
      }

      const parsedDeck = parsedDecks[0];
      const lastCard = await prisma.card.findFirst({
        where: { deckId: targetDeck.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      const startOrder = lastCard ? lastCard.order + 1 : 0;

      await prisma.$transaction(async (tx) => {
        const cardsData = parsedDeck.cards.map((card, index) => ({
          deckId: targetDeck!.id,
          front: card.front,
          back: card.back,
          frontType: card.frontType,
          backType: card.backType,
          order: startOrder + index,
        }));
        await tx.card.createMany({ data: cardsData });

        const newCards = await tx.card.findMany({
          where: { deckId: targetDeck!.id, order: { gte: startOrder } },
          select: { id: true },
        });

        const defaultStats = createNewReviewStats();
        await tx.review.createMany({
          data: newCards.map((card) => ({
            cardId: card.id,
            userId: user.id,
            reps: defaultStats.reps,
            againCount: defaultStats.againCount,
            hardCount: defaultStats.hardCount,
            goodCount: defaultStats.goodCount,
            easyCount: defaultStats.easyCount,
            lastReview: defaultStats.lastReview ?? undefined,
          })),
        });
      });

      // Propage l'ajout vers les decks importés en aval si le deck cible est public.
      if (targetDeck.isPublic) {
        await syncImportedDecks(targetDeck.id);
      }

      return NextResponse.json({
        success: true,
        mode: 'append',
        deck: {
          id: targetDeck.id,
          name: targetDeck.name,
          addedCards: parsedDeck.cards.length,
        },
      });
    }

    // Vérification de la limite cumulée (utile en mode split avec plusieurs decks).
    if (userDecksCount + parsedDecks.length > settings.maxDecksPerUser) {
      return NextResponse.json(
        {
          error: `L'import ferait passer le compte à ${
            userDecksCount + parsedDecks.length
          } decks, au-delà de la limite de ${settings.maxDecksPerUser}. Supprimez des decks existants ou réduisez la sélection.`,
        },
        { status: 403 }
      );
    }

    // Création atomique de tous les decks et de leurs cartes/reviews.
    const createdDecks = await prisma.$transaction(async (tx) => {
      const out: Array<{ id: string; name: string; cardsCount: number }> = [];
      for (const parsedDeck of parsedDecks) {
        const createdDeck = await tx.deck.create({
          data: {
            name: parsedDeck.name,
            userId: user.id,
            cards: {
              create: parsedDeck.cards.map((card, index) => ({
                front: card.front,
                back: card.back,
                frontType: card.frontType,
                backType: card.backType,
                order: index,
              })),
            },
          },
          include: {
            cards: { orderBy: { order: 'asc' } },
          },
        });

        const defaultStats = createNewReviewStats();
        const reviewsData = createdDeck.cards.map((card, index) => {
          const ankiStats = parsedDeck.cards[index]?.stats;
          if (ankiStats) {
            return {
              cardId: card.id,
              userId: user.id,
              reps: ankiStats.reps,
              againCount: ankiStats.againCount,
              hardCount: ankiStats.hardCount,
              goodCount: ankiStats.goodCount,
              easyCount: ankiStats.easyCount,
              lastReview: ankiStats.lastReview ?? undefined,
              interval: ankiStats.interval ?? undefined,
              nextReview: ankiStats.nextReview ?? undefined,
              easeFactor: ankiStats.easeFactor,
              stability: ankiStats.stability,
              difficulty: ankiStats.difficulty,
              lapses: ankiStats.lapses,
              status: ankiStats.status,
            };
          }
          return {
            cardId: card.id,
            userId: user.id,
            reps: defaultStats.reps,
            againCount: defaultStats.againCount,
            hardCount: defaultStats.hardCount,
            goodCount: defaultStats.goodCount,
            easyCount: defaultStats.easyCount,
            lastReview: defaultStats.lastReview ?? undefined,
          };
        });

        await tx.review.createMany({ data: reviewsData });

        out.push({
          id: createdDeck.id,
          name: createdDeck.name,
          cardsCount: createdDeck.cards.length,
        });
      }
      return out;
    });

    // Réponse rétro-compatible : pour un seul deck importé, on conserve la clé
    // `deck` ; pour plusieurs, on expose `decks` (les deux peuvent coexister).
    return NextResponse.json({
      success: true,
      deck: createdDecks[0],
      decks: createdDecks,
      count: createdDecks.length,
    });
  } catch (error) {
    console.error('Import error:', error);

    let errorMessage = 'Erreur lors de l\'importation du deck';

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        errorMessage = 'Ce deck contient des cartes déjà importées';
      } else if (error.code === 'P2003') {
        errorMessage = 'Erreur de référence dans la base de données';
      } else {
        errorMessage = `Erreur de base de données : ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
