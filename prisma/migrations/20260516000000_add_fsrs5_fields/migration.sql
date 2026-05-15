-- Migration FSRS-5
-- Ajoute les champs nécessaires à l'algorithme FSRS-5 (ts-fsrs)
-- ainsi que les limites quotidiennes par deck.

-- AlterEnum: ajout de la valeur 'RELEARNING' au CardStatus
-- Note Postgres : ALTER TYPE ADD VALUE doit s'exécuter hors transaction.
-- Prisma scinde automatiquement cette commande dans une transaction séparée.
ALTER TYPE "CardStatus" ADD VALUE 'RELEARNING';

-- AlterTable Review : champs FSRS-5
ALTER TABLE "Review"
  ADD COLUMN "stability"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "lapses"     INTEGER          NOT NULL DEFAULT 0;

-- AlterTable Deck : limites quotidiennes FSRS
ALTER TABLE "Deck"
  ADD COLUMN "newCardsPerDay"   INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "maxReviewsPerDay" INTEGER NOT NULL DEFAULT 200;
