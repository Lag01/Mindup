import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { unimportPublicDeck } from '@/lib/sync-decks';
import { getAppSettings } from '@/lib/settings';
import { deleteImagesAsync } from '@/lib/image-cleanup';
import { computeLocalDayStart } from '@/lib/dates';
import { computeRealisticDue } from '@/lib/anki';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Début du jour dans le fuseau du client (header X-Timezone), pour aligner
    // le budget quotidien sur la file de révision réelle. Fallback UTC.
    const tz = request.headers.get('x-timezone') || 'UTC';
    const todayStart = computeLocalDayStart(new Date(), tz);

    // Optimisation : utiliser une requête SQL agrégée au lieu de charger toutes les cartes et reviews
    // Cela élimine le problème N+1 et réduit considérablement la charge mémoire
    const decksWithStats = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      createdAt: Date;
      isPublic: boolean;
      originalDeckId: string | null;
      learningMethod: string;
      budgetMode: string;
      cardsPerDay: number;
      newCardsPerDay: number;
      maxReviewsPerDay: number;
      totalCards: bigint;
      notStarted: bigint;
      totalReviews: bigint | null;
      ankiNew: bigint | null;
      ankiLearning: bigint | null;
      ankiReview: bigint | null;
      ankiRelearning: bigint | null;
      ankiYoung: bigint | null;
      ankiMature: bigint | null;
      ankiDueReviews: bigint | null;
    }>>`
      SELECT
        d.id,
        d.name,
        d."createdAt",
        d."isPublic",
        d."originalDeckId",
        d."learningMethod",
        d."budgetMode",
        d."cardsPerDay",
        d."newCardsPerDay",
        d."maxReviewsPerDay",
        COUNT(DISTINCT c.id) as "totalCards",
        COUNT(DISTINCT CASE WHEN r.reps IS NULL OR r.reps = 0 THEN c.id END) as "notStarted",
        COUNT(DISTINCT re.id) as "totalReviews",

        -- Stats ANKI (les cartes sans review sont comptées comme NEW)
        COUNT(DISTINCT CASE
          WHEN d."learningMethod" = 'ANKI' AND (r."status" IS NULL OR r."status" = 'NEW')
          THEN c.id
        END) as "ankiNew",
        COUNT(DISTINCT CASE
          WHEN d."learningMethod" = 'ANKI' AND r."status" = 'LEARNING'
          THEN c.id
        END) as "ankiLearning",
        COUNT(DISTINCT CASE
          WHEN d."learningMethod" = 'ANKI' AND r."status" = 'REVIEW'
          THEN c.id
        END) as "ankiReview",
        COUNT(DISTINCT CASE
          WHEN d."learningMethod" = 'ANKI' AND r."status" = 'RELEARNING'
          THEN c.id
        END) as "ankiRelearning",
        -- Découpage des cartes REVIEW selon le seuil de maturité (21j, cf. MATURE_INTERVAL_DAYS).
        -- « Matures » = maîtrisées (définition Anki, alignée sur la page de stats).
        COUNT(DISTINCT CASE
          WHEN d."learningMethod" = 'ANKI' AND r."status" = 'REVIEW' AND r.interval >= 21
          THEN c.id
        END) as "ankiMature",
        COUNT(DISTINCT CASE
          WHEN d."learningMethod" = 'ANKI' AND r."status" = 'REVIEW' AND (r.interval < 21 OR r.interval IS NULL)
          THEN c.id
        END) as "ankiYoung",
        -- Cartes de révision réellement dues (hors nouvelles), pour le plafonnage budget.
        -- Exclut les cartes déjà notées aujourd'hui (cohérent avec /api/review : une carte
        -- vue aujourd'hui ne revient pas dans la journée), pour ne pas regonfler le compteur.
        COUNT(DISTINCT CASE
          WHEN d."learningMethod" = 'ANKI'
            AND r."status" IN ('LEARNING', 'REVIEW', 'RELEARNING')
            AND r."nextReview" <= NOW()
            AND NOT EXISTS (
              SELECT 1 FROM "ReviewEvent" re2
              WHERE re2."cardId" = c.id
                AND re2."userId" = ${user.id}
                AND re2."createdAt" >= ${todayStart}
            )
          THEN c.id
        END) as "ankiDueReviews"

      FROM "Deck" d
      LEFT JOIN "Card" c ON c."deckId" = d.id
      LEFT JOIN "Review" r ON r."cardId" = c.id AND r."userId" = ${user.id}
      LEFT JOIN "ReviewEvent" re ON re."cardId" = c.id AND re."userId" = ${user.id}
      WHERE d."userId" = ${user.id}
      GROUP BY d.id, d.name, d."createdAt", d."isPublic", d."originalDeckId", d."learningMethod",
               d."budgetMode", d."cardsPerDay", d."newCardsPerDay", d."maxReviewsPerDay"
      ORDER BY d."createdAt" DESC
    `;

    // Cartes « faites aujourd'hui » par deck, ventilées en nouvelles (premier ReviewEvent
    // aujourd'hui) vs révisions (premier ReviewEvent avant aujourd'hui). Même sémantique que
    // /api/review pour garantir l'alignement compteur dashboard ↔ file réelle.
    const doneTodayRows = await prisma.$queryRaw<Array<{
      deck_id: string;
      new_today: bigint;
      review_today: bigint;
    }>>`
      SELECT c."deckId" AS deck_id,
             COUNT(*) FILTER (WHERE seen.first_at >= ${todayStart}) AS new_today,
             COUNT(*) FILTER (WHERE seen.first_at <  ${todayStart}) AS review_today
      FROM (
        SELECT re."cardId", MIN(re."createdAt") AS first_at, MAX(re."createdAt") AS last_at
        FROM "ReviewEvent" re
        WHERE re."userId" = ${user.id}
        GROUP BY re."cardId"
        HAVING MAX(re."createdAt") >= ${todayStart}
      ) seen
      JOIN "Card" c ON c.id = seen."cardId"
      GROUP BY c."deckId"
    `;

    const doneTodayByDeck = new Map<string, { newToday: number; reviewToday: number }>();
    for (const row of doneTodayRows) {
      doneTodayByDeck.set(row.deck_id, {
        newToday: Number(row.new_today),
        reviewToday: Number(row.review_today),
      });
    }

    // Convertir les bigint en number pour JSON
    const decks = decksWithStats.map(deck => ({
      id: deck.id,
      name: deck.name,
      createdAt: deck.createdAt,
      learningMethod: deck.learningMethod,
      budgetMode: deck.budgetMode,
      cardsPerDay: deck.cardsPerDay,
      newCardsPerDay: deck.newCardsPerDay,
      maxReviewsPerDay: deck.maxReviewsPerDay,
      totalCards: Number(deck.totalCards),
      notStarted: Number(deck.notStarted),
      totalReviews: Number(deck.totalReviews),
      isPublic: deck.isPublic,
      originalDeckId: deck.originalDeckId,
      isImported: !!deck.originalDeckId,
      // Stats Anki (null si méthode IMMEDIATE)
      ankiStats: deck.learningMethod === 'ANKI' ? {
        new: Number(deck.ankiNew),
        learning: Number(deck.ankiLearning),
        review: Number(deck.ankiReview),
        relearning: Number(deck.ankiRelearning),
        young: Number(deck.ankiYoung),
        mature: Number(deck.ankiMature),
        // Compteur « à réviser » réaliste : dues plafonnées par le budget de révision,
        // nouvelles plafonnées par le budget de nouvelles (cf. computeRealisticDue /
        // /api/review).
        due: computeRealisticDue({
          budgetMode: deck.budgetMode === 'TOTAL' ? 'TOTAL' : 'SEPARATE',
          dueReviews: Number(deck.ankiDueReviews ?? 0),
          newAvailable: Number(deck.ankiNew ?? 0),
          cardsPerDay: deck.cardsPerDay,
          newCardsPerDay: deck.newCardsPerDay,
          maxReviewsPerDay: deck.maxReviewsPerDay,
          newDoneToday: doneTodayByDeck.get(deck.id)?.newToday ?? 0,
          reviewDoneToday: doneTodayByDeck.get(deck.id)?.reviewToday ?? 0,
        }),
      } : null,
    }));

    return NextResponse.json({ decks });
  } catch (error) {
    console.error('Get decks error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des decks' },
      { status: 500 }
    );
  }
}

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
        { error: `Vous avez atteint la limite de ${settings.maxDecksPerUser} decks par compte. Supprimez un deck avant d'en créer un nouveau.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, learningMethod } = body;

    // Valider le nom du deck
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom du deck est requis' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Le nom du deck ne peut pas dépasser 100 caractères' },
        { status: 400 }
      );
    }

    // Valider la méthode d'apprentissage
    if (learningMethod && !['IMMEDIATE', 'ANKI'].includes(learningMethod)) {
      return NextResponse.json(
        { error: 'Méthode d\'apprentissage invalide' },
        { status: 400 }
      );
    }

    // Créer le deck vide
    const deck = await prisma.deck.create({
      data: {
        name: name.trim(),
        userId: user.id,
        learningMethod: learningMethod || 'IMMEDIATE', // Par défaut IMMEDIATE
      },
    });

    return NextResponse.json({
      success: true,
      deck: {
        id: deck.id,
        name: deck.name,
        createdAt: deck.createdAt,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create deck error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du deck' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('id');

    if (!deckId) {
      return NextResponse.json(
        { error: 'ID du deck requis' },
        { status: 400 }
      );
    }

    // Verify deck belongs to user and get all cards with images
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
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

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    // Si c'est un deck importé, utiliser unimportPublicDeck pour décrémenter le compteur
    if (deck.originalDeckId) {
      await unimportPublicDeck(user.id, deckId);
      return NextResponse.json({ success: true });
    }

    // Bloquer la suppression des decks publics (utiliser unpublish d'abord)
    if (deck.isPublic) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer un deck public. Veuillez d\'abord le dépublier depuis le panel admin.' },
        { status: 403 }
      );
    }

    // Collecter toutes les images du deck avant suppression
    const imagesToDelete = deck.cards.flatMap(card =>
      [card.frontImage, card.backImage].filter(Boolean) as string[]
    );

    // Delete deck (cascade will delete cards and reviews)
    await prisma.deck.delete({
      where: {
        id: deckId,
      },
    });

    // Nettoyage asynchrone de toutes les images du deck
    if (imagesToDelete.length > 0) {
      console.log(`[CLEANUP] Nettoyage de ${imagesToDelete.length} image(s) du deck supprimé ${deckId}`);
      deleteImagesAsync(imagesToDelete).catch(err =>
        console.error('[CLEANUP] Erreur nettoyage images du deck:', err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete deck error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du deck' },
      { status: 500 }
    );
  }
}
