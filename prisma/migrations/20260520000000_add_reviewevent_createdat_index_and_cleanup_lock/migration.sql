-- Z7-03 : index isolé sur ReviewEvent.createdAt (en plus du composé (userId, createdAt))
-- pour accélérer les requêtes admin/stats filtrant uniquement par fenêtre temporelle.
CREATE INDEX "ReviewEvent_createdAt_idx" ON "ReviewEvent"("createdAt");

-- Z7-04 : colonne de lock optimiste pour le cron de nettoyage des images.
-- Le cron pose la timestamp en début d'exécution et la libère à la fin ; un cron
-- concurrent qui lit une valeur récente abandonne. Une valeur "vieille" (>1h)
-- est considérée comme lock orphelin et peut être écrasée.
ALTER TABLE "AppSettings" ADD COLUMN "imageCleanupLockedAt" TIMESTAMP(3);
