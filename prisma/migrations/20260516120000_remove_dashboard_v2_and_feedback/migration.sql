-- Migration : suppression du thème v2 et du système de feedback
-- 1) Normaliser la préférence : tous les non-admin sur v1, tous les admin sur v3
-- 2) Supprimer les colonnes liées au feedback v2

-- Étape 1 : non-admin -> v1 (couvre v2, null et toute valeur incohérente)
UPDATE "User"
SET "dashboardVersion" = 'v1'
WHERE "isAdmin" = false;

-- Étape 2 : admin -> v3 (thème sidebar par défaut pour l'admin)
UPDATE "User"
SET "dashboardVersion" = 'v3'
WHERE "isAdmin" = true;

-- Étape 3 : suppression de l'index inutile
DROP INDEX IF EXISTS "User_dashboardChoiceDate_idx";

-- Étape 4 : suppression des colonnes feedback
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "dashboardChoiceDate",
  DROP COLUMN IF EXISTS "dashboardFeedbackRating",
  DROP COLUMN IF EXISTS "dashboardFeedbackDate",
  DROP COLUMN IF EXISTS "dashboardFeedbackGiven";
