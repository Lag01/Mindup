import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id: deckId } = await context.params;

    // Verify deck belongs to user and get learning method
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      select: {
        id: true,
        learningMethod: true,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const yearAgo = new Date(today);
    yearAgo.setDate(yearAgo.getDate() - 365);

    // Optimisation : requête SQL agrégée au lieu de charger toutes les cartes
    // Cela élimine les boucles forEach et réduit drastiquement la charge mémoire
    // Calcule simultanément les définitions IMMEDIATE et ANKI ; la sélection finale
    // est faite en TS selon deck.learningMethod.
    const [mainStats] = await prisma.$queryRaw<Array<{
      totalCards: bigint;
      notStarted: bigint;
      inProgress: bigint;
      reviewed: bigint;
      totalReviews: bigint;
      againCount: bigint;
      hardCount: bigint;
      goodCount: bigint;
      easyCount: bigint;
      difficultCardsImmediate: bigint;
      difficultCardsAnki: bigint;
      masteredCardsImmediate: bigint;
      masteredCardsAnki: bigint;
      reviewsToday: bigint;
      reviewsThisWeek: bigint;
      ankiNew: bigint;
      ankiLearning: bigint;
      ankiReview: bigint;
      ankiRelearning: bigint;
      ankiDueToday: bigint;
      avgInterval: number | null;
      avgStability: number | null;
    }>>`
      SELECT
        COUNT(*) as "totalCards",
        COUNT(CASE WHEN r.reps IS NULL OR r.reps = 0 THEN 1 END) as "notStarted",
        COUNT(CASE WHEN r.reps > 0 THEN 1 END) as "inProgress",
        COUNT(CASE WHEN r.reps > 0 THEN 1 END) as "reviewed",
        COALESCE(SUM(r.reps), 0) as "totalReviews",
        COALESCE(SUM(r."againCount"), 0) as "againCount",
        COALESCE(SUM(r."hardCount"), 0) as "hardCount",
        COALESCE(SUM(r."goodCount"), 0) as "goodCount",
        COALESCE(SUM(r."easyCount"), 0) as "easyCount",

        -- Définition IMMEDIATE (ratio lifetime)
        COUNT(CASE
          WHEN r.reps > 0 AND (r."againCount" + r."hardCount")::float / r.reps > 0.5
          THEN 1
        END) as "difficultCardsImmediate",
        COUNT(CASE
          WHEN r.reps > 0 AND r."easyCount"::float / r.reps > 0.7
          THEN 1
        END) as "masteredCardsImmediate",

        -- Définition ANKI (FSRS)
        COUNT(CASE
          WHEN r.lapses >= 3 OR (r.stability > 0 AND r.stability < 7)
          THEN 1
        END) as "difficultCardsAnki",
        COUNT(CASE
          WHEN r."status" = 'REVIEW' AND r.interval >= 21
          THEN 1
        END) as "masteredCardsAnki",

        COUNT(CASE WHEN r."lastReview" >= ${today} THEN 1 END) as "reviewsToday",
        COUNT(CASE WHEN r."lastReview" >= ${weekAgo} THEN 1 END) as "reviewsThisWeek",

        -- Stats ANKI / FSRS
        COUNT(CASE WHEN r."status" = 'NEW' THEN 1 END) as "ankiNew",
        COUNT(CASE WHEN r."status" = 'LEARNING' THEN 1 END) as "ankiLearning",
        COUNT(CASE WHEN r."status" = 'REVIEW' THEN 1 END) as "ankiReview",
        COUNT(CASE WHEN r."status" = 'RELEARNING' THEN 1 END) as "ankiRelearning",
        COUNT(CASE WHEN r."nextReview" <= NOW() THEN 1 END) as "ankiDueToday",
        AVG(r."interval") as "avgInterval",
        AVG(CASE WHEN r.stability > 0 THEN r.stability END) as "avgStability"
      FROM "Card" c
      LEFT JOIN "Review" r ON r."cardId" = c.id AND r."userId" = ${user.id}
      WHERE c."deckId" = ${deckId}
    `;

    const isAnki = deck.learningMethod === 'ANKI';
    const difficultCardsCount = isAnki
      ? Number(mainStats.difficultCardsAnki)
      : Number(mainStats.difficultCardsImmediate);
    const masteredCardsCount = isAnki
      ? Number(mainStats.masteredCardsAnki)
      : Number(mainStats.masteredCardsImmediate);

    // Requête pour l'historique complet (max 180 jours)
    // Basé sur ReviewEvent.createdAt : compte chaque révision individuelle,
    // contrairement à Review.lastReview qui n'enregistre que la dernière révision par carte.
    const maxHistoryDays = 180;
    const oldestDate = new Date(today);
    oldestDate.setDate(oldestDate.getDate() - maxHistoryDays);

    const reviewHistoryRaw = await prisma.$queryRaw<Array<{
      date: Date;
      count: bigint;
    }>>`
      SELECT
        DATE(re."createdAt") as "date",
        COUNT(*) as "count"
      FROM "ReviewEvent" re
      INNER JOIN "Card" c ON c.id = re."cardId"
      WHERE c."deckId" = ${deckId}
        AND re."userId" = ${user.id}
        AND re."createdAt" >= ${oldestDate}
      GROUP BY DATE(re."createdAt")
      ORDER BY "date" ASC
    `;

    // Construire l'historique complet depuis oldestDate jusqu'à aujourd'hui
    const historyMap = new Map<string, number>();

    // Trouver la date de la première révision
    const firstReviewDate = reviewHistoryRaw.length > 0
      ? new Date(reviewHistoryRaw[0].date)
      : today;

    const effectiveStartDate = firstReviewDate > oldestDate
      ? firstReviewDate
      : oldestDate;

    // Créer les entrées pour tous les jours
    let currentDate = new Date(effectiveStartDate);
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      historyMap.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Remplir avec les vraies valeurs
    reviewHistoryRaw.forEach(row => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      if (historyMap.has(dateStr)) {
        historyMap.set(dateStr, Number(row.count));
      }
    });

    const reviewHistory = Array.from(historyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Calculer le taux de succès
    const totalReviews = Number(mainStats.totalReviews);
    const totalSuccesses = Number(mainStats.goodCount) + Number(mainStats.easyCount);
    const successRate = totalReviews > 0 ? (totalSuccesses / totalReviews) * 100 : 0;

    // 1. Temps moyen par carte (basé sur ReviewEvents)
    const avgTimeResult = await prisma.$queryRaw<Array<{ avgTimePerCard: number | null }>>`
      SELECT AVG(time_diff) as "avgTimePerCard"
      FROM (
        SELECT EXTRACT(EPOCH FROM (
          LEAD(re."createdAt") OVER (PARTITION BY re."cardId" ORDER BY re."createdAt") - re."createdAt"
        )) as time_diff
        FROM "ReviewEvent" re
        INNER JOIN "Card" c ON c.id = re."cardId"
        WHERE c."deckId" = ${deckId} AND re."userId" = ${user.id}
      ) time_diffs
      WHERE time_diff IS NOT NULL AND time_diff BETWEEN 1 AND 300
    `;
    const avgTimePerCard = avgTimeResult[0]?.avgTimePerCard ?? 0;

    // 2. Top 5 cartes difficiles
    const topDifficultCards = await prisma.$queryRaw<Array<{
      cardId: string;
      front: string;
      back: string;
      frontType: string;
      backType: string;
      frontImage: string | null;
      backImage: string | null;
      againCount: bigint;
      hardCount: bigint;
      reps: bigint;
      failureRate: number;
    }>>`
      SELECT
        c.id as "cardId",
        c.front,
        c.back,
        c."frontType",
        c."backType",
        c."frontImage",
        c."backImage",
        r."againCount",
        r."hardCount",
        r.reps,
        (r."againCount" + r."hardCount")::float / NULLIF(r.reps, 0) as "failureRate"
      FROM "Card" c
      INNER JOIN "Review" r ON r."cardId" = c.id
      WHERE c."deckId" = ${deckId} AND r."userId" = ${user.id} AND r.reps >= 3
      ORDER BY "failureRate" DESC
      LIMIT 5
    `;

    // 3. Comparaison période précédente
    // Basée sur ReviewEvent : compte chaque réponse individuelle dans la fenêtre,
    // au lieu de Review.lastReview qui rattache tous les cumuls à la dernière review.
    const reviewComparison = await prisma.$queryRaw<Array<{
      reviewsToday: bigint;
      reviewsYesterday: bigint;
      reviewsThisWeek: bigint;
      reviewsPreviousWeek: bigint;
      successRateThisWeek: number | null;
      successRatePreviousWeek: number | null;
    }>>`
      SELECT
        COUNT(CASE WHEN re."createdAt" >= ${today} THEN 1 END) as "reviewsToday",
        COUNT(CASE WHEN re."createdAt" >= ${yesterday} AND re."createdAt" < ${today} THEN 1 END) as "reviewsYesterday",
        COUNT(CASE WHEN re."createdAt" >= ${weekAgo} THEN 1 END) as "reviewsThisWeek",
        COUNT(CASE WHEN re."createdAt" >= ${twoWeeksAgo} AND re."createdAt" < ${weekAgo} THEN 1 END) as "reviewsPreviousWeek",

        CASE
          WHEN COUNT(CASE WHEN re."createdAt" >= ${weekAgo} THEN 1 END) > 0
          THEN (COUNT(CASE WHEN re."createdAt" >= ${weekAgo} AND re."rating" IN ('good', 'easy') THEN 1 END)::float /
                COUNT(CASE WHEN re."createdAt" >= ${weekAgo} THEN 1 END)) * 100
          ELSE NULL
        END as "successRateThisWeek",

        CASE
          WHEN COUNT(CASE WHEN re."createdAt" >= ${twoWeeksAgo} AND re."createdAt" < ${weekAgo} THEN 1 END) > 0
          THEN (COUNT(CASE WHEN re."createdAt" >= ${twoWeeksAgo} AND re."createdAt" < ${weekAgo} AND re."rating" IN ('good', 'easy') THEN 1 END)::float /
                COUNT(CASE WHEN re."createdAt" >= ${twoWeeksAgo} AND re."createdAt" < ${weekAgo} THEN 1 END)) * 100
          ELSE NULL
        END as "successRatePreviousWeek"
      FROM "ReviewEvent" re
      INNER JOIN "Card" c ON c.id = re."cardId"
      WHERE c."deckId" = ${deckId}
        AND re."userId" = ${user.id}
        AND re."createdAt" >= ${twoWeeksAgo}
    `;

    const comparison = reviewComparison[0];
    const reviewsTodayNum = Number(comparison?.reviewsToday ?? 0);
    const reviewsYesterdayNum = Number(comparison?.reviewsYesterday ?? 0);
    const reviewsThisWeekNum = Number(comparison?.reviewsThisWeek ?? 0);
    const reviewsPreviousWeekNum = Number(comparison?.reviewsPreviousWeek ?? 0);

    // Calcul du streak actuel
    const streakResult = await prisma.$queryRaw<Array<{ currentStreak: bigint }>>`
      WITH daily_reviews AS (
        SELECT DISTINCT DATE(r."lastReview") as review_date
        FROM "Card" c
        INNER JOIN "Review" r ON r."cardId" = c.id
        WHERE c."deckId" = ${deckId}
          AND r."userId" = ${user.id}
          AND r."lastReview" IS NOT NULL
        ORDER BY review_date DESC
      ),
      streak_groups AS (
        SELECT
          review_date,
          review_date - (ROW_NUMBER() OVER (ORDER BY review_date DESC))::int * INTERVAL '1 day' as streak_group
        FROM daily_reviews
      ),
      current_streak_group AS (
        SELECT streak_group
        FROM streak_groups
        ORDER BY review_date DESC
        LIMIT 1
      )
      SELECT COALESCE(COUNT(*), 0) as "currentStreak"
      FROM streak_groups
      WHERE streak_group = (SELECT streak_group FROM current_streak_group)
        AND EXISTS (
          SELECT 1 FROM daily_reviews
          WHERE review_date >= CURRENT_DATE - INTERVAL '1 day'
        )
    `;

    const currentStreak = Number(streakResult[0]?.currentStreak ?? 0);

    const reviewsVsYesterday = reviewsYesterdayNum > 0
      ? ((reviewsTodayNum - reviewsYesterdayNum) / reviewsYesterdayNum) * 100
      : 0;
    const reviewsVsPreviousWeek = reviewsPreviousWeekNum > 0
      ? ((reviewsThisWeekNum - reviewsPreviousWeekNum) / reviewsPreviousWeekNum) * 100
      : 0;

    const successRateThisWeek = comparison?.successRateThisWeek ?? 0;
    const successRatePreviousWeek = comparison?.successRatePreviousWeek ?? 0;
    const successRateChange = successRatePreviousWeek > 0
      ? successRateThisWeek - successRatePreviousWeek
      : 0;

    // 4. Dernières cartes maîtrisées
    const recentlyMastered = await prisma.$queryRaw<Array<{
      cardId: string;
      front: string;
      masteredAt: Date;
    }>>`
      SELECT c.id as "cardId", c.front, r."lastReview" as "masteredAt"
      FROM "Card" c
      INNER JOIN "Review" r ON r."cardId" = c.id
      WHERE c."deckId" = ${deckId}
        AND r."userId" = ${user.id}
        AND r.reps > 0
        AND r."easyCount"::float / NULLIF(r.reps, 0) > 0.7
      ORDER BY r."lastReview" DESC
      LIMIT 5
    `;

    // 5. Prédictions
    const totalCards = Number(mainStats.totalCards);
    const remainingCards = totalCards - masteredCardsCount;

    // Vélocité de maturation réaliste.
    // Ancienne formule (buguée) : COUNT(cartes easyCount/reps>0.7) / 30 → produisait
    // des estimations absurdes (« ~480 semaines ») car elle divisait un stock par 30
    // jours fixes même pour un utilisateur n'ayant étudié que quelques jours.
    // Nouvelle approche : nombre de cartes maîtrisées récemment (selon la définition
    // du mode), normalisé par le nombre de JOURS RÉELLEMENT ÉTUDIÉS dans la fenêtre.
    const [velocityRow] = await prisma.$queryRaw<Array<{
      maturedAnki: bigint;
      maturedImmediate: bigint;
      activeDays: bigint;
    }>>`
      SELECT
        COUNT(DISTINCT CASE
          WHEN r.status = 'REVIEW' AND r.interval >= 21 AND r."lastReview" >= ${monthAgo}
          THEN c.id END) as "maturedAnki",
        COUNT(DISTINCT CASE
          WHEN r.reps > 0 AND r."easyCount"::float / NULLIF(r.reps, 0) > 0.7 AND r."lastReview" >= ${monthAgo}
          THEN c.id END) as "maturedImmediate",
        (
          SELECT COUNT(DISTINCT DATE(re."createdAt"))
          FROM "ReviewEvent" re
          INNER JOIN "Card" c2 ON c2.id = re."cardId"
          WHERE c2."deckId" = ${deckId}
            AND re."userId" = ${user.id}
            AND re."createdAt" >= ${monthAgo}
        ) as "activeDays"
      FROM "Card" c
      LEFT JOIN "Review" r ON r."cardId" = c.id AND r."userId" = ${user.id}
      WHERE c."deckId" = ${deckId}
    `;

    const maturedRecently = isAnki
      ? Number(velocityRow?.maturedAnki ?? 0)
      : Number(velocityRow?.maturedImmediate ?? 0);
    const activeDays = Number(velocityRow?.activeDays ?? 0);

    // Garde-fous : il faut un minimum d'historique pour estimer une cadence.
    const MIN_ACTIVE_DAYS = 3;
    const MAX_ESTIMATE_DAYS = 3650; // borne dure (~10 ans) pour éviter tout débordement
    let avgMasteredPerDay = 0;
    let estimatedCompletionDays: number;
    if (remainingCards <= 0) {
      estimatedCompletionDays = 0; // deck déjà maîtrisé
    } else if (activeDays < MIN_ACTIVE_DAYS || maturedRecently === 0) {
      estimatedCompletionDays = -1; // données insuffisantes
    } else {
      avgMasteredPerDay = maturedRecently / activeDays;
      estimatedCompletionDays = Math.min(
        MAX_ESTIMATE_DAYS,
        Math.ceil(remainingCards / avgMasteredPerDay)
      );
    }

    const projectedMasteryRate = totalCards > 0 && avgMasteredPerDay > 0
      ? Math.min(100, ((masteredCardsCount + (avgMasteredPerDay * 30)) / totalCards) * 100)
      : totalCards > 0
        ? (masteredCardsCount / totalCards) * 100
        : 0;

    // Temps total d'étude (estimation basée sur ReviewEvents)
    const totalStudyTimeResult = await prisma.$queryRaw<Array<{ totalMinutes: number | null }>>`
      SELECT SUM(time_diff) / 60 as "totalMinutes"
      FROM (
        SELECT EXTRACT(EPOCH FROM (
          LEAD(re."createdAt") OVER (PARTITION BY re."cardId" ORDER BY re."createdAt") - re."createdAt"
        )) as time_diff
        FROM "ReviewEvent" re
        INNER JOIN "Card" c ON c.id = re."cardId"
        WHERE c."deckId" = ${deckId} AND re."userId" = ${user.id}
      ) time_diffs
      WHERE time_diff IS NOT NULL AND time_diff BETWEEN 1 AND 300
    `;
    const totalStudyTime = Math.round(totalStudyTimeResult[0]?.totalMinutes ?? 0);

    // ============================================================
    // Métriques spécifiques au mode ANKI (FSRS-5)
    // ============================================================
    // Type d'une cellule du tableau de rétention réelle (taux + effectif).
    type RetentionCell = { rate: number | null; count: number };
    type RetentionRow = { young: RetentionCell; mature: RetentionCell; all: RetentionCell };

    let ankiExtended: {
      forecast: {
        dueToday: number;
        dueTomorrow: number;
        due7d: number;
        due30d: number;
        dailyLoadAvg: number;
        // Série journalière sur 365 jours, segmentée par statut. `count` = total du jour.
        dailyForecast: Array<{ date: string; learning: number; young: number; mature: number; count: number }>;
      };
      trueRetention: number;
      trueRetentionTable: {
        today: RetentionRow;
        yesterday: RetentionRow;
        week: RetentionRow;
        month: RetentionRow;
        year: RetentionRow;
      };
      intervalDistribution: { i1: number; i7: number; i30: number; i90: number; i180: number; iMax: number };
      stabilityDistribution: { lt7: number; lt30: number; lt90: number; gte90: number };
      difficultyDistribution: { easy: number; medium: number; hard: number };
      fragileCards: Array<{
        cardId: string;
        front: string;
        back: string;
        frontType: 'TEXT' | 'LATEX';
        backType: 'TEXT' | 'LATEX';
        frontImage: string | null;
        backImage: string | null;
        stability: number;
        lapses: number;
      }>;
    } | null = null;

    if (isAnki) {
      const FORECAST_DAYS = 365;
      const inForecastDays = new Date(today);
      inForecastDays.setDate(inForecastDays.getDate() + FORECAST_DAYS);

      // a) Forecast journalier sur 365 jours, segmenté par statut (apprentissage,
      //    récentes <21j, matures >=21j) — façon « Charge de travail » d'Anki.
      const forecastRaw = await prisma.$queryRaw<Array<{
        date: Date; learning: bigint; young: bigint; mature: bigint;
      }>>`
        SELECT
          DATE(r."nextReview") as "date",
          COUNT(CASE WHEN r."status" IN ('LEARNING', 'RELEARNING') THEN 1 END) as "learning",
          COUNT(CASE WHEN r."status" = 'REVIEW' AND r.interval < 21 THEN 1 END) as "young",
          COUNT(CASE WHEN r."status" = 'REVIEW' AND r.interval >= 21 THEN 1 END) as "mature"
        FROM "Review" r
        INNER JOIN "Card" c ON c.id = r."cardId"
        WHERE c."deckId" = ${deckId}
          AND r."userId" = ${user.id}
          AND r."status" IN ('LEARNING', 'REVIEW', 'RELEARNING')
          AND r."nextReview" >= ${today}
          AND r."nextReview" < ${inForecastDays}
        GROUP BY DATE(r."nextReview")
        ORDER BY "date" ASC
      `;

      // Construire la série complète sur 365 jours (avec zéros).
      const forecastMap = new Map<string, { learning: number; young: number; mature: number }>();
      const cursor = new Date(today);
      for (let i = 0; i < FORECAST_DAYS; i++) {
        forecastMap.set(cursor.toISOString().split('T')[0], { learning: 0, young: 0, mature: 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
      forecastRaw.forEach(row => {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        if (forecastMap.has(dateStr)) {
          forecastMap.set(dateStr, {
            learning: Number(row.learning),
            young: Number(row.young),
            mature: Number(row.mature),
          });
        }
      });
      const dailyForecast = Array.from(forecastMap.entries()).map(([date, seg]) => ({
        date,
        learning: seg.learning,
        young: seg.young,
        mature: seg.mature,
        count: seg.learning + seg.young + seg.mature,
      }));

      const dueToday = dailyForecast[0]?.count ?? 0;
      const dueTomorrow = dailyForecast[1]?.count ?? 0;
      const due7d = dailyForecast.slice(0, 7).reduce((sum, d) => sum + d.count, 0);
      const due30d = dailyForecast.slice(0, 30).reduce((sum, d) => sum + d.count, 0);

      // Charge journalière (steady-state) : somme des 1/intervalle des cartes en
      // révision. Approxime le nombre de révisions/jour à l'équilibre (cf. Anki).
      const [loadRow] = await prisma.$queryRaw<Array<{ dailyLoad: number | null }>>`
        SELECT COALESCE(SUM(1.0 / NULLIF(r.interval, 0)), 0) as "dailyLoad"
        FROM "Review" r
        INNER JOIN "Card" c ON c.id = r."cardId"
        WHERE c."deckId" = ${deckId}
          AND r."userId" = ${user.id}
          AND r."status" IN ('LEARNING', 'REVIEW', 'RELEARNING')
          AND r.interval > 0
      `;
      const dailyLoadAvg = Math.round((loadRow?.dailyLoad ?? 0) * 10) / 10;

      // b) Rétention réelle par période (Aujourd'hui / Hier / Semaine / Mois / Année)
      //    × maturité (Récentes 1-20j / Matures >=21j / Tout). Comme Anki.
      //    Note : approximation — utilise l'intervalle ACTUEL de la Review, pas
      //    l'intervalle historique au moment du ReviewEvent (non stocké).
      const retentionWindow = async (since: Date, until: Date) => {
        const [row] = await prisma.$queryRaw<Array<{
          youngTotal: bigint; youngOk: bigint;
          matureTotal: bigint; matureOk: bigint;
          allTotal: bigint; allOk: bigint;
        }>>`
          SELECT
            COUNT(CASE WHEN r.interval BETWEEN 1 AND 20 THEN 1 END) as "youngTotal",
            COUNT(CASE WHEN r.interval BETWEEN 1 AND 20 AND re.rating IN ('good','easy') THEN 1 END) as "youngOk",
            COUNT(CASE WHEN r.interval >= 21 THEN 1 END) as "matureTotal",
            COUNT(CASE WHEN r.interval >= 21 AND re.rating IN ('good','easy') THEN 1 END) as "matureOk",
            COUNT(CASE WHEN r.interval >= 1 THEN 1 END) as "allTotal",
            COUNT(CASE WHEN r.interval >= 1 AND re.rating IN ('good','easy') THEN 1 END) as "allOk"
          FROM "ReviewEvent" re
          INNER JOIN "Review" r ON r.id = re."reviewId"
          INNER JOIN "Card" c ON c.id = re."cardId"
          WHERE c."deckId" = ${deckId}
            AND re."userId" = ${user.id}
            AND re."createdAt" >= ${since}
            AND re."createdAt" < ${until}
        `;
        const cell = (ok: bigint, total: bigint): RetentionCell => {
          const t = Number(total);
          return { rate: t > 0 ? Math.round((Number(ok) / t) * 1000) / 10 : null, count: t };
        };
        return {
          young: cell(row.youngOk, row.youngTotal),
          mature: cell(row.matureOk, row.matureTotal),
          all: cell(row.allOk, row.allTotal),
        } as RetentionRow;
      };

      const farFuture = new Date(today);
      farFuture.setDate(farFuture.getDate() + 1);
      const [retToday, retYesterday, retWeek, retMonth, retYear] = await Promise.all([
        retentionWindow(today, farFuture),
        retentionWindow(yesterday, today),
        retentionWindow(weekAgo, farFuture),
        retentionWindow(monthAgo, farFuture),
        retentionWindow(yearAgo, farFuture),
      ]);
      const trueRetentionTable = {
        today: retToday,
        yesterday: retYesterday,
        week: retWeek,
        month: retMonth,
        year: retYear,
      };
      // Valeur scalaire conservée pour compat : rétention matures sur 30 jours.
      const retentionResult = [{ trueRetention: retMonth.mature.rate }];

      // c) Distribution des intervalles (6 buckets)
      const [intervalDist] = await prisma.$queryRaw<Array<{
        i1: bigint; i7: bigint; i30: bigint; i90: bigint; i180: bigint; iMax: bigint;
      }>>`
        SELECT
          COUNT(CASE WHEN r.interval = 1 THEN 1 END) as "i1",
          COUNT(CASE WHEN r.interval BETWEEN 2 AND 7 THEN 1 END) as "i7",
          COUNT(CASE WHEN r.interval BETWEEN 8 AND 30 THEN 1 END) as "i30",
          COUNT(CASE WHEN r.interval BETWEEN 31 AND 90 THEN 1 END) as "i90",
          COUNT(CASE WHEN r.interval BETWEEN 91 AND 180 THEN 1 END) as "i180",
          COUNT(CASE WHEN r.interval > 180 THEN 1 END) as "iMax"
        FROM "Review" r
        INNER JOIN "Card" c ON c.id = r."cardId"
        WHERE c."deckId" = ${deckId}
          AND r."userId" = ${user.id}
          AND r.interval IS NOT NULL
          AND r.interval > 0
      `;

      // d) Distribution stabilité / difficulté + cartes fragiles
      const [healthDist] = await prisma.$queryRaw<Array<{
        sLt7: bigint; sLt30: bigint; sLt90: bigint; sGte90: bigint;
        dEasy: bigint; dMedium: bigint; dHard: bigint;
      }>>`
        SELECT
          COUNT(CASE WHEN r.stability > 0 AND r.stability < 7 THEN 1 END) as "sLt7",
          COUNT(CASE WHEN r.stability >= 7 AND r.stability < 30 THEN 1 END) as "sLt30",
          COUNT(CASE WHEN r.stability >= 30 AND r.stability < 90 THEN 1 END) as "sLt90",
          COUNT(CASE WHEN r.stability >= 90 THEN 1 END) as "sGte90",
          COUNT(CASE WHEN r.difficulty > 0 AND r.difficulty <= 3 THEN 1 END) as "dEasy",
          COUNT(CASE WHEN r.difficulty > 3 AND r.difficulty <= 7 THEN 1 END) as "dMedium",
          COUNT(CASE WHEN r.difficulty > 7 THEN 1 END) as "dHard"
        FROM "Review" r
        INNER JOIN "Card" c ON c.id = r."cardId"
        WHERE c."deckId" = ${deckId} AND r."userId" = ${user.id}
      `;

      const fragileCardsRaw = await prisma.$queryRaw<Array<{
        cardId: string;
        front: string;
        back: string;
        frontType: string;
        backType: string;
        frontImage: string | null;
        backImage: string | null;
        stability: number;
        lapses: number;
      }>>`
        SELECT
          c.id as "cardId",
          c.front, c.back,
          c."frontType", c."backType",
          c."frontImage", c."backImage",
          r.stability,
          r.lapses
        FROM "Card" c
        INNER JOIN "Review" r ON r."cardId" = c.id
        WHERE c."deckId" = ${deckId}
          AND r."userId" = ${user.id}
          AND r.reps > 0
          AND (r.lapses >= 3 OR (r.stability > 0 AND r.stability < 7))
        ORDER BY r.stability ASC, r.lapses DESC
        LIMIT 5
      `;

      ankiExtended = {
        forecast: { dueToday, dueTomorrow, due7d, due30d, dailyLoadAvg, dailyForecast },
        trueRetention: retentionResult[0]?.trueRetention != null
          ? Math.round(retentionResult[0].trueRetention * 10) / 10
          : 0,
        trueRetentionTable,
        intervalDistribution: {
          i1: Number(intervalDist.i1),
          i7: Number(intervalDist.i7),
          i30: Number(intervalDist.i30),
          i90: Number(intervalDist.i90),
          i180: Number(intervalDist.i180),
          iMax: Number(intervalDist.iMax),
        },
        stabilityDistribution: {
          lt7: Number(healthDist.sLt7),
          lt30: Number(healthDist.sLt30),
          lt90: Number(healthDist.sLt90),
          gte90: Number(healthDist.sGte90),
        },
        difficultyDistribution: {
          easy: Number(healthDist.dEasy),
          medium: Number(healthDist.dMedium),
          hard: Number(healthDist.dHard),
        },
        fragileCards: fragileCardsRaw.map(card => ({
          cardId: card.cardId,
          front: card.front,
          back: card.back,
          frontType: card.frontType as 'TEXT' | 'LATEX',
          backType: card.backType as 'TEXT' | 'LATEX',
          frontImage: card.frontImage,
          backImage: card.backImage,
          stability: Math.round(card.stability * 10) / 10,
          lapses: card.lapses,
        })),
      };
    }

    // Construire l'objet stats final
    const stats = {
      totalCards: Number(mainStats.totalCards),
      cardsByStatus: {
        notStarted: Number(mainStats.notStarted),
        inProgress: Number(mainStats.inProgress),
        reviewed: Number(mainStats.reviewed),
      },
      totalReviews,
      successRate,
      ratingDistribution: {
        again: Number(mainStats.againCount),
        hard: Number(mainStats.hardCount),
        good: Number(mainStats.goodCount),
        easy: Number(mainStats.easyCount),
      },
      difficultCards: difficultCardsCount,
      masteredCards: masteredCardsCount,
      reviewsToday: reviewsTodayNum,
      reviewsThisWeek: reviewsThisWeekNum,
      reviewHistory,
      learningMethod: deck.learningMethod,
      currentStreak,
      // Stats Anki (null si méthode IMMEDIATE)
      ankiStats: isAnki && ankiExtended ? {
        new: Number(mainStats.ankiNew),
        learning: Number(mainStats.ankiLearning),
        review: Number(mainStats.ankiReview),
        relearning: Number(mainStats.ankiRelearning),
        // Catégories Anki : récentes (REVIEW interval<21) vs matures (>=21).
        mature: Number(mainStats.masteredCardsAnki),
        young: Math.max(0, Number(mainStats.ankiReview) - Number(mainStats.masteredCardsAnki)),
        dueToday: Number(mainStats.ankiDueToday),
        avgInterval: mainStats.avgInterval ? Math.round(mainStats.avgInterval) : 0,
        avgStability: mainStats.avgStability ? Math.round(mainStats.avgStability * 10) / 10 : 0,
        ...ankiExtended,
      } : null,

      // Nouvelles métriques enrichies
      avgTimePerCard: Math.round(avgTimePerCard),
      totalStudyTime,
      reviewsVsYesterday: Math.round(reviewsVsYesterday * 10) / 10,
      reviewsVsPreviousWeek: Math.round(reviewsVsPreviousWeek * 10) / 10,
      successRateChange: Math.round(successRateChange * 10) / 10,
      estimatedCompletionDays,
      projectedMasteryRate: Math.round(projectedMasteryRate * 10) / 10,
      topDifficultCards: topDifficultCards.map(card => ({
        cardId: card.cardId,
        front: card.front,
        back: card.back,
        frontType: card.frontType as 'TEXT' | 'LATEX',
        backType: card.backType as 'TEXT' | 'LATEX',
        frontImage: card.frontImage,
        backImage: card.backImage,
        failureRate: Math.round(card.failureRate * 100),
      })),
      recentlyMastered: recentlyMastered.map(card => ({
        cardId: card.cardId,
        front: card.front.substring(0, 100),
        masteredAt: card.masteredAt.toISOString(),
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get deck stats error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
