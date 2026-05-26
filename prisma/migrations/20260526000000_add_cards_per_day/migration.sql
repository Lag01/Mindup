-- Objectif quotidien unique « N cartes/jour » (priorité aux dues, complété par des nouvelles).
-- Additif et non destructif : les decks existants démarrent à 20.
ALTER TABLE "Deck" ADD COLUMN "cardsPerDay" INTEGER NOT NULL DEFAULT 20;
