-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dashboardVersion" TEXT,
ADD COLUMN IF NOT EXISTS "dashboardChoiceDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "dashboardFeedbackRating" INTEGER,
ADD COLUMN IF NOT EXISTS "dashboardFeedbackDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "dashboardFeedbackGiven" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_dashboardVersion_idx" ON "User"("dashboardVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_dashboardChoiceDate_idx" ON "User"("dashboardChoiceDate");
