-- Supprimer tous les scores sauf les meilleurs par userId/mode
-- Cette migration nettoie les données redondantes avant d'ajouter la contrainte unique
DELETE FROM "VeryFastMathScore"
WHERE id NOT IN (
  SELECT DISTINCT ON ("userId", mode) id
  FROM "VeryFastMathScore"
  ORDER BY "userId", mode, score DESC
);
