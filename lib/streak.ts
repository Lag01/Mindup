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

  const oneYearAgo = new Date(today);
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  const reviewDates = await prisma.$queryRaw<Array<{ review_date: Date }>>`
    SELECT DISTINCT DATE("createdAt") as review_date
    FROM "ReviewEvent"
    WHERE "userId" = ${userId}
      AND "createdAt" >= ${oneYearAgo}
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

  for (let i = 0; i < 365; i++) {
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
  const { currentStreak } = await calculateStreakOptimized(userId);

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxStreak: true },
  });

  const newMaxStreak = Math.max(currentStreak, currentUser?.maxStreak || 0);

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak,
      maxStreak: newMaxStreak,
      lastStreakUpdate: new Date(),
    },
  });

  return { currentStreak, maxStreak: newMaxStreak };
}

export { calculateStreakOptimized };
