import { prisma } from './prisma';

interface StreakCalculationResult {
  currentStreak: number;
  includesCurrentDay: boolean;
}

async function calculateStreakOptimized(userId: string): Promise<StreakCalculationResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const hasReviewedToday = await prisma.reviewEvent.findFirst({
    where: {
      userId,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const twoYearsAgo = new Date(today);
  twoYearsAgo.setDate(twoYearsAgo.getDate() - 730);

  const reviewDates = await prisma.$queryRaw<Array<{ review_date: Date }>>`
    SELECT DISTINCT DATE("createdAt") as review_date
    FROM "ReviewEvent"
    WHERE "userId" = ${userId}
      AND "createdAt" >= ${twoYearsAgo}
    ORDER BY review_date DESC
  `;

  if (reviewDates.length === 0) {
    return { currentStreak: 0, includesCurrentDay: false };
  }

  const dateSet = new Set(
    reviewDates.map(d => new Date(d.review_date).toISOString().split('T')[0])
  );

  let streak = 0;
  let currentDate = new Date(today);
  const includesCurrentDay = !!hasReviewedToday;

  if (!hasReviewedToday) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  for (let i = 0; i < 730; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (dateSet.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { currentStreak: streak, includesCurrentDay };
}

export async function updateUserStreak(userId: string) {
  // Vérifier si le streak a déjà été mis à jour aujourd'hui
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      maxStreak: true,
      lastStreakUpdate: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastUpdate = currentUser?.lastStreakUpdate;
  if (lastUpdate) {
    const lastUpdateDate = new Date(lastUpdate);
    lastUpdateDate.setHours(0, 0, 0, 0);

    // Si déjà mis à jour aujourd'hui, ne rien faire
    if (lastUpdateDate.getTime() === today.getTime()) {
      return {
        currentStreak: currentUser?.currentStreak || 0,
        maxStreak: currentUser?.maxStreak || 0,
        alreadyUpdatedToday: true
      };
    }
  }

  const { currentStreak } = await calculateStreakOptimized(userId);

  // Validation : le streak ne peut pas être négatif
  if (currentStreak < 0) {
    console.error(`Streak invalide calculé pour l'utilisateur ${userId}: ${currentStreak}`);
    return {
      currentStreak: currentUser?.currentStreak || 0,
      maxStreak: currentUser?.maxStreak || 0,
      alreadyUpdatedToday: false
    };
  }

  const newMaxStreak = Math.max(currentStreak, currentUser?.maxStreak || 0);

  // Vérification de l'invariant : currentStreak <= maxStreak
  if (currentStreak > newMaxStreak) {
    console.error(`Violation d'invariant pour l'utilisateur ${userId}: currentStreak (${currentStreak}) > maxStreak (${newMaxStreak})`);
  }

  // Mise à jour atomique pour éviter les race conditions
  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { lastStreakUpdate: null },
        {
          lastStreakUpdate: {
            lt: today
          }
        }
      ]
    },
    data: {
      currentStreak,
      maxStreak: newMaxStreak,
      lastStreakUpdate: new Date(),
    },
  });

  // Si aucune mise à jour n'a été effectuée, un autre process a déjà mis à jour aujourd'hui
  if (result.count === 0) {
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, maxStreak: true },
    });

    return {
      currentStreak: updatedUser?.currentStreak || 0,
      maxStreak: updatedUser?.maxStreak || 0,
      alreadyUpdatedToday: true
    };
  }

  return { currentStreak, maxStreak: newMaxStreak, alreadyUpdatedToday: false };
}

export { calculateStreakOptimized };
