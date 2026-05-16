import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { parseXML, parseCSV, type ParsedDeck } from '@/lib/parsers';
import { parseAPKG } from '@/lib/parsers/apkg';
import { createNewReviewStats } from '@/lib/revision';
import { getAppSettings } from '@/lib/settings';

// Limites de taille (en octets). .apkg est binaire et peut contenir plus de cartes
// mais reste petit sans médias (~1 Mo pour 1000 cartes). 4 Mo couvre largement les
// usages standards et reste sous la limite Vercel serverless (~4.5 Mo payload).
const MAX_TEXT_SIZE = 5 * 1024 * 1024;
const MAX_APKG_SIZE = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier la limite de decks
    const settings = await getAppSettings();
    const userDecksCount = await prisma.deck.count({
      where: { userId: user.id },
    });

    if (userDecksCount >= settings.maxDecksPerUser) {
      return NextResponse.json(
        { error: `Vous avez atteint la limite de ${settings.maxDecksPerUser} decks par compte. Supprimez un deck avant d'en importer un nouveau.` },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const preserveHistory = formData.get('preserveHistory') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fallbackName = file.name.replace(/\.[^.]+$/, '') || 'Deck importé';

    let parsedDeck: ParsedDeck;

    try {
      if (fileExtension === 'xml') {
        if (file.size > MAX_TEXT_SIZE) {
          return NextResponse.json({ error: 'Fichier XML trop volumineux (max 5 Mo)' }, { status: 400 });
        }
        parsedDeck = parseXML(await file.text());
      } else if (fileExtension === 'csv') {
        if (file.size > MAX_TEXT_SIZE) {
          return NextResponse.json({ error: 'Fichier CSV trop volumineux (max 5 Mo)' }, { status: 400 });
        }
        parsedDeck = await parseCSV(await file.text());
      } else if (fileExtension === 'apkg') {
        if (file.size > MAX_APKG_SIZE) {
          return NextResponse.json(
            { error: `Fichier .apkg trop volumineux (max ${MAX_APKG_SIZE / (1024 * 1024)} Mo). Les decks contenant des médias dépassent souvent cette limite ; cette version ignore les médias mais ne peut pas traiter de fichiers trop gros.` },
            { status: 400 }
          );
        }
        parsedDeck = await parseAPKG(await file.arrayBuffer(), {
          preserveHistory,
          fallbackName,
        });
      } else {
        return NextResponse.json(
          { error: 'Format de fichier non supporté. Utilisez .apkg, .xml ou .csv' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `Erreur de parsing : ${error.message}` },
        { status: 400 }
      );
    }

    // Création atomique du deck, des cartes et des reviews
    const deck = await prisma.$transaction(async (tx) => {
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
          cards: {
            orderBy: { order: 'asc' },
          },
        },
      });

      // Construire les Review : par défaut stats vierges, ou stats Anki préservées si APKG.
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

      await tx.review.createMany({
        data: reviewsData,
      });

      return createdDeck;
    });

    return NextResponse.json({
      success: true,
      deck: {
        id: deck.id,
        name: deck.name,
        cardsCount: deck.cards.length,
      },
    });
  } catch (error) {
    console.error('Import error:', error);

    // Identifier le type d'erreur pour donner un message plus précis
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

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
