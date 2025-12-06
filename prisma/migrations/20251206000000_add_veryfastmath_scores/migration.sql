-- CreateEnum (si MathMode n'existe pas encore)
DO $$ BEGIN
 CREATE TYPE "MathMode" AS ENUM ('ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "VeryFastMathScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "MathMode" NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VeryFastMathScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VeryFastMathScore_userId_mode_idx" ON "VeryFastMathScore"("userId", "mode");

-- CreateIndex
CREATE INDEX "VeryFastMathScore_mode_createdAt_idx" ON "VeryFastMathScore"("mode", "createdAt");

-- CreateIndex
CREATE INDEX "VeryFastMathScore_mode_score_idx" ON "VeryFastMathScore"("mode", "score");

-- AddForeignKey
ALTER TABLE "VeryFastMathScore" ADD CONSTRAINT "VeryFastMathScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
