-- Mode de budget quotidien ANKI : SEPARATE (deux quotas indépendants) ou TOTAL
-- (objectif unique, révisions prioritaires complétées par des nouvelles cartes).
-- Additif et non destructif : les decks existants démarrent en SEPARATE, donc
-- aucun changement de comportement tant que l'utilisateur n'active pas TOTAL.
CREATE TYPE "BudgetMode" AS ENUM ('SEPARATE', 'TOTAL');
ALTER TABLE "Deck" ADD COLUMN "budgetMode" "BudgetMode" NOT NULL DEFAULT 'SEPARATE';
