import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { updateReviewStats, Rating } from '@/lib/revision';
import { updateAnkiReviewStats, AnkiRating, CardStatus } from '@/lib/anki';
import { updateUserStreak } from '@/lib/streak';
import { computeLocalDayStart } from '@/lib/dates';

interface RawCard {
  id: string;
  front: string;
  back: string;
  frontType: string;
  backType: string;
  frontImage: string | null;
  backImage: string | null;
  order: number;
  reviewId: string | null;
  reps: number | null;
  againCount: number | null;
  hardCount: number | null;
  goodCount: number | null;
  easyCount: number | null;
  lastReview: Date | null;
  interval: number | null;
  nextReview: Date | null;
  easeFactor: number | null;
  stability: number | null;
  difficulty: number | null;
  lapses: number | null;
  status: string | null;
}

function mapRawCard(row: RawCard) {
  return {
    id: row.id,
    front: row.front,
    back: row.back,
    frontType: row.frontType,
    backType: row.backType,
    frontImage: row.frontImage,
    backImage: row.backImage,
    review: row.reviewId
      ? {
          id: row.reviewId,
          reps: row.reps,
          againCount: row.againCount,
          hardCount: row.hardCount,
          goodCount: row.goodCount,
          easyCount: row.easyCount,
          lastReview: row.lastReview,
          interval: row.interval,
          nextReview: row.nextReview,
          easeFactor: row.easeFactor,
          stability: row.stability,
          difficulty: row.difficulty,
          lapses: row.lapses,
          status: row.status,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deckId');

    if (!deckId) {
      return NextResponse.json({ error: 'ID du deck requis' }, { status: 400 });
    }

    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: user.id },
      select: {
        id: true,
        learningMethod: true,
        newCardsPerDay: true,
        maxReviewsPerDay: true,
      },
    });

    if (!deck) {
      return NextResponse.json({ error: 'Deck non trouvé' }, { status: 404 });
    }

    if (deck.learningMethod !== 'ANKI') {
      // Mode IMMEDIATE : retourner toutes les cartes sans filtre
      const cards = await prisma.card.findMany({
        where: { deckId },
        include: {
          reviews: { where: { userId: user.id }, take: 1 },
        },
        orderBy: { order: 'asc' },
      });

      return NextResponse.json({
        cards: cards.map(card => ({
          id: card.id,
          front: card.front,
          back: card.back,
          frontType: card.frontType,
          backType: card.backType,
          frontImage: card.frontImage,
          backImage: card.backImage,
          review: card.reviews[0] || null,
        })),
        learningMethod: deck.learningMethod,
      });
    }

    // --- Mode ANKI ---
    const now = new Date();
    // Timezone client transmise via header (X-Timezone). Si absente ou invalide,
    // computeLocalDayStart retombe sur UTC. Cela évite que la "fenêtre du jour"
    // soit calée sur le fuseau du serveur (Vercel = UTC) pour les users hors UTC.
    const tz = request.headers.get('x-timezone') || 'UTC';
    const todayStart = computeLocalDayStart(now, tz);
    const customStudy = searchParams.get('customStudy') === 'true';

    // Cartes « faites aujourd'hui » ventilées en deux budgets indépendants : nouvelles
    // (premier ReviewEvent aujourd'hui) vs révisions (premier ReviewEvent avant aujourd'hui).
    // Même sémantique que le compteur dashboard (/api/decks) pour éviter toute divergence.
    const doneTodayResult = await prisma.$queryRaw<[{ new_today: bigint; review_today: bigint }]>`
      SELECT
        COUNT(*) FILTER (WHERE first_at >= ${todayStart}) AS new_today,
        COUNT(*) FILTER (WHERE first_at <  ${todayStart}) AS review_today
      FROM (
        SELECT re."cardId", MIN(re."createdAt") AS first_at, MAX(re."createdAt") AS last_at
        FROM "ReviewEvent" re
        JOIN "Card" c ON c.id = re."cardId"
        WHERE re."userId" = ${user.id}
          AND c."deckId" = ${deckId}
        GROUP BY re."cardId"
        HAVING MAX(re."createdAt") >= ${todayStart}
      ) seen
    `;

    const newDoneToday = Number(doneTodayResult[0]?.new_today ?? 0);
    const reviewDoneToday = Number(doneTodayResult[0]?.review_today ?? 0);

    // Plafond dur pour éviter qu'un budget anormalement élevé (customStudy ou paramètre
    // user mal configuré) ne génère une requête SQL avec LIMIT illimité.
    const MAX_REVIEW_LIMIT = 1000;
    // Deux budgets indépendants : révisions et nouvelles cartes.
    const reviewBudget = Math.min(
      MAX_REVIEW_LIMIT,
      customStudy ? 99999 : Math.max(0, deck.maxReviewsPerDay - reviewDoneToday)
    );
    const newBudget = Math.min(
      MAX_REVIEW_LIMIT,
      customStudy ? 99999 : Math.max(0, deck.newCardsPerDay - newDoneToday)
    );

    // 1) Récupérer les cartes de révision (LEARNING / REVIEW / RELEARNING, dues maintenant)
    //    dans la limite du budget de révision.
    const reviewCards: RawCard[] =
      reviewBudget > 0
        ? await prisma.$queryRaw<RawCard[]>`
            SELECT c.id, c.front, c.back,
                   c."frontType", c."backType",
                   c."frontImage", c."backImage", c."order",
                   r.id AS "reviewId",
                   r.reps, r."againCount", r."hardCount", r."goodCount", r."easyCount",
                   r."lastReview", r.interval, r."nextReview", r."easeFactor",
                   r.stability, r.difficulty, r.lapses, r.status
            FROM "Card" c
            JOIN "Review" r ON r."cardId" = c.id AND r."userId" = ${user.id}
            WHERE c."deckId" = ${deckId}
              AND r.status IN ('LEARNING', 'REVIEW', 'RELEARNING')
              AND r."nextReview" <= ${now}
              -- Garantie « une vue par carte par jour » : une carte déjà notée aujourd'hui
              -- (typiquement une ratée replanifiée à quelques minutes) ne ressort pas dans
              -- la journée, quel que soit l'appareil. Elle reviendra demain.
              AND NOT EXISTS (
                SELECT 1 FROM "ReviewEvent" re2
                WHERE re2."cardId" = c.id
                  AND re2."userId" = ${user.id}
                  AND re2."createdAt" >= ${todayStart}
              )
            ORDER BY r."nextReview" ASC
            LIMIT ${reviewBudget}
          `
        : [];

    // 2) Nouvelles cartes (jamais vues ou status=NEW), dans la limite de leur propre budget.
    const newCards: RawCard[] =
      newBudget > 0
        ? await prisma.$queryRaw<RawCard[]>`
            SELECT c.id, c.front, c.back,
                   c."frontType", c."backType",
                   c."frontImage", c."backImage", c."order",
                   r.id AS "reviewId",
                   r.reps, r."againCount", r."hardCount", r."goodCount", r."easyCount",
                   r."lastReview", r.interval, r."nextReview", r."easeFactor",
                   r.stability, r.difficulty, r.lapses, r.status
            FROM "Card" c
            LEFT JOIN "Review" r ON r."cardId" = c.id AND r."userId" = ${user.id}
            WHERE c."deckId" = ${deckId}
              AND (r.id IS NULL OR r.status = 'NEW')
            ORDER BY c."order" ASC
            LIMIT ${newBudget}
          `
        : [];


    const allCards = [...reviewCards, ...newCards];

    // Prochaine carte due (parmi celles non sélectionnées dans cette session).
    // Si la session est vide (budget épuisé OU pas de cartes due maintenant),
    // ça renseigne l'utilisateur sur l'horaire de la prochaine carte à réviser.
    const nextDueRow = await prisma.review.findFirst({
      where: {
        userId: user.id,
        card: { deckId },
        status: { in: ['LEARNING', 'REVIEW', 'RELEARNING'] },
        nextReview: { gt: now },
      },
      orderBy: { nextReview: 'asc' },
      select: { nextReview: true },
    });

    return NextResponse.json({
      cards: allCards.map(mapRawCard),
      learningMethod: deck.learningMethod,
      meta: {
        newCount: newCards.length,
        reviewCount: reviewCards.length,
        reviewBudget,
        newBudget,
        customStudy,
        doneToday: {
          newSeen: newDoneToday,
          newLimit: deck.newCardsPerDay,
          reviewSeen: reviewDoneToday,
          reviewLimit: deck.maxReviewsPerDay,
          // Agrégats rétro-compatibles (ReviewV1 lit cardsSeen/cardsLimit).
          cardsSeen: newDoneToday + reviewDoneToday,
          cardsLimit: deck.newCardsPerDay + deck.maxReviewsPerDay,
        },
        nextDueAt: nextDueRow?.nextReview ?? null,
      },
    });
  } catch (error) {
    console.error('Get review cards error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des cartes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, rating } = body;

    if (!cardId || !rating) {
      return NextResponse.json({ error: 'cardId et rating requis' }, { status: 400 });
    }

    if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
      return NextResponse.json({ error: 'Rating invalide' }, { status: 400 });
    }

    let currentReview = await prisma.review.findUnique({
      where: { cardId_userId: { cardId, userId: user.id } },
      include: { card: { include: { deck: true } } },
    });

    if (!currentReview) {
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: { deck: true },
      });

      if (!card || card.deck.userId !== user.id) {
        return NextResponse.json(
          { error: 'Carte non trouvée ou accès non autorisé' },
          { status: 404 }
        );
      }

      currentReview = await prisma.review.create({
        data: { cardId, userId: user.id },
        include: { card: { include: { deck: true } } },
      });
    }

    if (currentReview.card.deck.userId !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const learningMethod = currentReview.card.deck.learningMethod;

    // État de la review après mise à jour, renvoyé au client pour décider de la
    // réinsertion intra-session (boucle d'apprentissage Anki).
    let reviewState: {
      status: string | null;
      nextReview: Date | null;
      interval: number | null;
    } | null = null;

    await prisma.$transaction(async (tx) => {
      if (learningMethod === 'ANKI') {
        const ankiStats = updateAnkiReviewStats(
          {
            reps: currentReview.reps,
            againCount: currentReview.againCount,
            hardCount: currentReview.hardCount,
            goodCount: currentReview.goodCount,
            easyCount: currentReview.easyCount,
            lastReview: currentReview.lastReview,
            interval: currentReview.interval,
            nextReview: currentReview.nextReview,
            easeFactor: currentReview.easeFactor,
            stability: currentReview.stability,
            difficulty: currentReview.difficulty,
            lapses: currentReview.lapses,
            status: (currentReview.status as CardStatus) || 'NEW',
          },
          rating as AnkiRating
        );

        await tx.review.update({
          where: { cardId_userId: { cardId, userId: user.id } },
          data: {
            reps: ankiStats.reps,
            againCount: ankiStats.againCount,
            hardCount: ankiStats.hardCount,
            goodCount: ankiStats.goodCount,
            easyCount: ankiStats.easyCount,
            lastReview: ankiStats.lastReview,
            interval: ankiStats.interval,
            nextReview: ankiStats.nextReview,
            easeFactor: ankiStats.easeFactor,
            stability: ankiStats.stability,
            difficulty: ankiStats.difficulty,
            lapses: ankiStats.lapses,
            status: ankiStats.status,
          },
        });
      } else {
        const newStats = updateReviewStats(
          {
            reps: currentReview.reps,
            againCount: currentReview.againCount,
            hardCount: currentReview.hardCount,
            goodCount: currentReview.goodCount,
            easyCount: currentReview.easyCount,
            lastReview: currentReview.lastReview,
          },
          rating as Rating
        );

        await tx.review.update({
          where: { cardId_userId: { cardId, userId: user.id } },
          data: {
            reps: newStats.reps,
            againCount: newStats.againCount,
            hardCount: newStats.hardCount,
            goodCount: newStats.goodCount,
            easyCount: newStats.easyCount,
            lastReview: newStats.lastReview,
          },
        });
      }

      const updatedReview = await tx.review.findUnique({
        where: { cardId_userId: { cardId, userId: user.id } },
      });

      if (!updatedReview) throw new Error('Review not found after update');

      reviewState = {
        status: updatedReview.status,
        nextReview: updatedReview.nextReview,
        interval: updatedReview.interval,
      };

      await tx.reviewEvent.create({
        data: {
          reviewId: updatedReview.id,
          userId: user.id,
          cardId,
          rating: rating as Rating,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { reviewedCardsCount: { increment: 1 } },
      });
    });

    try {
      await updateUserStreak(user.id);
    } catch (streakError) {
      console.error('Erreur lors de la mise à jour du streak:', streakError);
    }

    return NextResponse.json({ success: true, review: reviewState });
  } catch (error) {
    console.error('Submit review error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la soumission de la révision' },
      { status: 500 }
    );
  }
}
