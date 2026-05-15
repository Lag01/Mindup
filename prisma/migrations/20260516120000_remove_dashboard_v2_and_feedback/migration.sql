-- Migration : suppression du thème v2 et du système de feedback
-- 1) Migrer les utilisateurs v2 vers v1 (non-admin), forcer v3 pour les admins sans préférence
-- 2) Supprimer les colonnes liées au feedback v2

-- Étape 1 : utilisateurs non-admin en v2 ou sans préférence -> v1
UPDATE "User"
SET "dashboardVersion" = 'v1'
WHERE ("dashboardVersion" = 'v2' OR "dashboardVersion" IS NULL)
  AND "isAdmin" = false;

-- Étape 2 : admins en v2 ou sans préférence -> v3 (nouveau thème par défaut pour l'admin)
UPDATE "User"
SET "dashboardVersion" = 'v3'
WHERE ("dashboardVersion" = 'v2' OR "dashboardVersion" IS NULL)
  AND "isAdmin" = true;

-- Étape 3 : suppression de l'index inutile
DROP INDEX IF EXISTS "User_dashboardChoiceDate_idx";

-- Étape 4 : suppression des colonnes feedback
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "dashboardChoiceDate",
  DROP COLUMN IF EXISTS "dashboardFeedbackRating",
  DROP COLUMN IF EXISTS "dashboardFeedbackDate",
  DROP COLUMN IF EXISTS "dashboardFeedbackGiven";
