import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
  console.log('🔥 Démarrage du calcul des streaks initiaux...\n');

  const users = await prisma.user.findMany({
    select: { id: true, displayName: true },
  });

  console.log(`📊 ${users.length} utilisateurs trouvés\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      const { currentStreak } = await calculateStreakOptimized(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          currentStreak,
          maxStreak: currentStreak,
          lastStreakUpdate: new Date(),
        },
      });

      console.log(`✅ ${user.displayName}: ${currentStreak} jours`);
      successCount++;
    } catch (error) {
      console.error(`❌ Erreur pour ${user.displayName}:`, error);
      errorCount++;
    }
  }

  console.log(`\n🎉 Migration terminée !`);
  console.log(`✅ ${successCount} utilisateurs mis à jour`);
  if (errorCount > 0) {
    console.log(`❌ ${errorCount} erreurs rencontrées`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
