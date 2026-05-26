# Log des erreurs résolues

Ce fichier consigne les bugs rencontrés sur l'application, leur cause racine et la solution implémentée. Avant de corriger une erreur similaire, consulter ce fichier.

---

## 2026-05-26 — Incohérence « maîtrisées » entre dashboard et page de stats

### Symptôme
Sur le deck « Verbes irréguliers », le dashboard affichait **40 maîtrisées** alors que la page de stats indiquait **4 % (4/113) maîtrisé** — pour un taux de réussite de 57 %. Trois chiffres apparemment contradictoires sur le même deck.

### Cause racine
Deux définitions différentes du mot « maîtrisé » coexistaient :
- **Dashboard** (`app/api/decks/route.ts`) : `ankiStats.review = COUNT(status='REVIEW')`, libellé « Maîtrisées » → comptait **toutes** les cartes en révision (jeunes + matures) = 40.
- **Page stats** (`app/api/decks/[id]/stats/route.ts`) : `masteredCardsAnki = COUNT(status='REVIEW' AND interval >= 21)` → seulement les **matures** = 4.

Le taux de réussite (57 %) est `(good+easy)/totalReviews` sur toute la vie de la carte : métrique indépendante de la maturité, donc pas réellement contradictoire — juste trompeuse par voisinage. La catégorie « Réapprentissage » (`RELEARNING`), pourtant calculée par l'API, n'était affichée nulle part, et les couleurs des catégories divergeaient entre chaque écran.

### Solution implémentée
- **Définition unique** : « maîtrisé » = **Matures** (`status='REVIEW' AND interval >= 21`), alignée sur Anki et sur la page de stats. Le dashboard expose désormais `ankiStats.young`/`mature` et n'utilise plus `review` pour ce libellé.
- **Source unique de vérité** `lib/cardCategories.ts` : 5 catégories (Nouvelles, En apprentissage, Réapprentissage, Jeunes, Matures) avec leurs couleurs (bleu / amber / rouge / lime / vert), plus `toDashboardGroups()` pour le regroupement compact 3 segments du dashboard.
- Dashboard (v1 + v3), `CardCountsCard` et `WorkloadChart` consomment ce module → couleurs et compteurs cohérents partout.

### Leçon
Un même terme métier (« maîtrisé ») doit avoir **une seule définition** centralisée. Quand deux écrans affichent le même concept avec des chiffres différents, chercher d'abord une divergence de formule entre leurs sources de données respectives.

---

## 2026-05-26 — Dashboard vide / 500 sur `/api/decks` : `column d.cardsPerDay does not exist` (42703)

### Symptôme
Après déploiement du modèle « objectif quotidien unique », plus aucun deck ne s'affichait dans le dashboard. Logs Vercel : `PrismaClientKnownRequestError` / `Raw query failed. Code: 42703. Message: column d.cardsPerDay does not exist`. Côté navigateur : `GET /api/decks 500`.

### Cause racine
Le code déployé sur Vercel sélectionnait la nouvelle colonne `Deck.cardsPerDay` (via `$queryRaw`), mais la migration `20260526000000_add_cards_per_day` n'avait **jamais été appliquée à la base de prod (Neon)**. Le code et le schéma de base étaient désynchronisés. **Deuxième occurrence du même problème** (cf. incident du 2026-05-26 sur `PATCH /api/admin/settings`, commit `4f06e92`).

### Solution implémentée
Application directe de la migration additive sur la base Neon de prod :
`ALTER TABLE "Deck" ADD COLUMN IF NOT EXISTS "cardsPerDay" INTEGER NOT NULL DEFAULT 20;`
Non destructif : les decks existants démarrent à 20. Aucun redéploiement Vercel nécessaire (erreur purement côté base). Colonne vérifiée via `information_schema.columns`.

### Leçon
**Tout commit introduisant un nouveau champ Prisma doit s'accompagner de l'application de la migration en prod (`npx prisma migrate deploy` ou SQL sur Neon) AVANT/AVEC le déploiement du code.** Pousser le code sans appliquer la migration casse systématiquement la prod avec un `42703`. À intégrer comme étape obligatoire du flux de déploiement.

---

## 2026-05-26 — Compteur « à réviser » persistant après une session (ex. « 19 à réviser » après 27 révisions)

### Symptôme
Après avoir révisé 27 cartes le matin, le dashboard affichait encore « 19 cartes à réviser » l'après-midi, alors que l'utilisateur avait l'impression d'avoir « fini » ses révisions.

### Cause racine
Le compteur n'était pas faux, mais le modèle prêtait à confusion. `computeRealisticDue` (`lib/anki.ts`) utilisait **deux budgets quotidiens indépendants** :
`à réviser = min(dues, maxReviewsPerDay - revDoneToday) + min(nouvelles, newCardsPerDay - newDoneToday)`.
Les 27 révisions du matin étaient surtout des cartes dues/en apprentissage, donc le budget de **nouvelles** restait presque intact (~19). Le compteur additionnait donc ~0 due + 19 nouvelles, sans distinguer les deux catégories dans un chiffre unique — d'où l'impression de bug.

### Solution implémentée
Remplacement des deux budgets séparés par un **objectif quotidien unique** `cardsPerDay` (par deck, défaut 20, toutes catégories confondues) :
- `budget = max(0, cardsPerDay - cardsSeenToday)` où `cardsSeenToday` = cartes distinctes révisées aujourd'hui.
- Compteur dashboard = `min(budget, dues + nouvelles)` (`computeRealisticDue` réécrit).
- File `/api/review` : on prend d'abord les cartes dues (priorité), puis on complète avec des nouvelles jusqu'au budget.
- Schéma : nouveau champ `Deck.cardsPerDay` (migration additive `20260526000000_add_cards_per_day`). `newCardsPerDay`/`maxReviewsPerDay` conservés mais inutilisés par la logique.
- UI réglages : champ unique « Cartes / jour » ; affichage session « X / N cartes aujourd'hui ».

### Leçon
Un compteur agrégé doit refléter le **modèle mental** de l'utilisateur. Fusionner deux budgets distincts (nouvelles vs révisions) dans un seul chiffre sans le matérialiser crée une confusion structurelle, même quand le calcul est exact.

---

## 2026-05-23 — Estimation de temps de maîtrise absurde (« ~480 semaines ») + compteur « à réviser » irréaliste

### Symptôme
1. Sur la page de statistiques d'un deck Anki, la carte « Estimation maîtrise » affichait des valeurs aberrantes (ex. « ~480 semaines » / « ~69 semaines ») pour un petit deck.
2. Sur l'accueil, le compteur « X à réviser » (en rouge) des decks Anki comptait *toutes* les cartes jamais vues + toutes les cartes dues, sans plafond — un deck de 480 nouvelles cartes affichait « 480 à réviser » alors que la file ne propose que `newCardsPerDay` (20 par défaut).

### Cause racine
1. `app/api/decks/[id]/stats/route.ts` calculait `avgMasteredPerDay = COUNT(cartes avec easyCount/reps>0.7) / 30`. Division par 30 jours *fixes* : pour un utilisateur ayant maîtrisé peu de cartes, le taux tendait vers ~0,1/jour, donc `remainingCards / taux` explosait.
2. `app/api/decks/route.ts` calculait `ankiDue` via `nextReview IS NULL OR nextReview <= NOW()` : le `IS NULL` incluait toutes les cartes NEW, sans tenir compte du budget quotidien ni des révisions déjà faites.

### Solution implémentée
1. **Vélocité de maturation réaliste** : `maturedRecently` (cartes REVIEW interval≥21 touchées sur 30 j, ou définition IMMEDIATE) ÷ **nombre de jours réellement étudiés** (DISTINCT DATE(ReviewEvent)). Garde-fous : sentinel `-1` (« Données insuffisantes ») si < 3 jours actifs ou 0 carte maturée ; borne dure à 3650 jours ; `formatCompletionDays` plafonne l'affichage (mois, « > 10 ans »).
2. **Compteur « à réviser » plafonné** : nouveau helper partagé `computeRealisticDue()` dans `lib/anki.ts`, répliquant la logique de budget de `/api/review` : `min(dues, maxReviewsPerDay - reviewsFaitsAujourdhui) + min(nouvelles, newCardsPerDay - newCardsFaitsAujourdhui)`. Le fuseau client est transmis via header `X-Timezone` pour aligner la fenêtre du jour.

À retenir : ne jamais diviser un *stock* (nombre de cartes) par une fenêtre temporelle fixe pour estimer un *flux* ; normaliser par l'activité réelle et borner toute extrapolation. Garder une source de vérité unique pour le « due » (compteur dashboard = file de révision).

---

## 2026-05-21 — 500 sur PATCH /api/admin/settings (migration prod non appliquée)

### Symptôme
Dans le panel admin, modifier `maxTotalUsers` ou `maxDecksPerUser` renvoie `500 Internal Server Error` côté `PATCH /api/admin/settings`. Le `GET` continue de répondre avec des valeurs en apparence correctes (10 et 5), ce qui masque le problème.

### Cause racine
La migration `prisma/migrations/20260520000000_add_reviewevent_createdat_index_and_cleanup_lock/` (ajoutant la colonne `AppSettings.imageCleanupLockedAt` et l'index `ReviewEvent_createdAt_idx`) n'a jamais été appliquée sur la prod Neon. `prisma migrate deploy` était bloqué par une migration en échec : `20251121222750_add_reviewed_cards_count` apparaissait deux fois dans `_prisma_migrations`, la deuxième entrée avec `finished_at = NULL` et le log `column "reviewedCardsCount" of relation "User" already exists`.

Conséquence : le client Prisma (généré depuis le schéma local) sélectionnait `imageCleanupLockedAt` dans tous les SELECT sur `AppSettings`, ce qui faisait planter chaque requête côté PostgreSQL. Le `GET` survivait parce que `lib/settings.ts:23-32` avale toute erreur et renvoie des défauts. Le `PATCH` propageait l'erreur → 500.

### Solution implémentée
Correction directe sur la DB prod (`raspy-dawn-60994491` / Mindup) en transaction :
1. `DELETE FROM _prisma_migrations WHERE migration_name='20251121222750_add_reviewed_cards_count' AND finished_at IS NULL` — supprime l'entrée en échec sans toucher à celle déjà résolue.
2. `CREATE INDEX IF NOT EXISTS "ReviewEvent_createdAt_idx" ON "ReviewEvent"("createdAt")`.
3. `ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "imageCleanupLockedAt" TIMESTAMP(3)`.
4. Insertion d'un enregistrement `_prisma_migrations` pour `20260520000000_add_reviewevent_createdat_index_and_cleanup_lock` avec le SHA256 du fichier `migration.sql`, pour que Prisma considère la migration appliquée.

À retenir : ne JAMAIS ajouter de fallback silencieux qui mange les erreurs DB (cf. `lib/settings.ts:23-32`). Ça a masqué un crash en prod pendant plusieurs déploiements.

---

## 2026-05-18 — HTTP method mismatch sur la suppression d'images

### Symptôme
Les images uploadées ne sont jamais effectivement supprimées du Vercel Blob (ni du dossier local) quand un utilisateur retire une image d'une carte. Le bug est silencieux côté UI — aucun message d'erreur. Le cron quotidien finit par nettoyer les images orphelines, mais l'opération immédiate échoue.

### Cause racine
La route `app/api/upload/delete-card-image/route.ts` exporte un handler `DELETE`. Or les 6 appels clients (`AddCardsV1.tsx`, `AddCardsV2.tsx`, `CardEditor.tsx`, `lib/image-service.ts`) utilisent `method: 'POST'`. Next.js retourne donc `405 Method Not Allowed` et le `try/catch` côté client log l'erreur dans la console sans la remonter à l'utilisateur.

### Solution implémentée
Renommer le handler `export async function DELETE` en `export async function POST`. Aucun client à modifier (tous appellent déjà en POST). Vérifié : `tsc --noEmit` passe.

---

## 2026-05-18 — Validation LaTeX contournée à l'import

### Symptôme
Un utilisateur peut importer un fichier CSV/XML/APKG contenant des commandes LaTeX dangereuses (`\input`, `\write`, `\documentclass`, etc.) et les cartes sont créées sans aucun filtrage. La fonction `validateCardContent` n'est invoquée que dans `POST /api/decks/[id]/cards` (création manuelle de carte).

### Cause racine
Trois chemins d'import dans `app/api/import/route.ts` (split-multi-decks, single deck, append à un deck existant) créent directement les cartes via `prisma.card.create*` sans passer par la validation. Oubli historique : `validateCardContent` a été ajoutée pour la création manuelle uniquement.

### Solution implémentée
Helper `sanitizeParsedDeck` ajouté dans `app/api/import/route.ts` qui filtre chaque carte via `validateCardContent` après le parsing et avant la persistance. Les cartes invalides sont silencieusement ignorées et un compteur `totalSkipped` est calculé. Si tous les decks ressortent vides, on retourne une erreur 400 explicite mentionnant le nombre de cartes rejetées.

---

## 2026-05-18 — Reset stats du deck V2 (changement de méthode) supprimait l'historique global

### Symptôme
Quand un utilisateur change la méthode d'apprentissage d'un deck (IMMEDIATE ↔ ANKI), toutes ses révisions du deck disparaissent du leaderboard global et du dashboard admin (`_count.reviewEvents` chute). C'est exactement le même symptôme que le bug du 2026-05-08 sur `reset-stats`, mais sur une route différente.

### Cause racine
`app/api/decks/[id]/settings/route.ts:65` utilisait `prisma.review.deleteMany(...)` lors du changement de méthode. La FK `ReviewEvent.reviewId` est en `onDelete: Cascade` dans `prisma/schema.prisma`, donc supprimer les `Review` cascade-supprime tous les `ReviewEvent` associés. Or le leaderboard et l'admin lisent précisément `ReviewEvent`, pas `Review`. Le pattern correct (déjà appliqué sur `reset-stats`) n'avait pas été propagé sur cette route.

### Solution implémentée
Passage à `prisma.review.updateMany` qui remet à zéro tous les compteurs (`reps`, `*Count`, `lastReview`, `interval`, `nextReview`, `easeFactor`, `stability`, `difficulty`, `lapses`, `status='NEW'`) sans toucher aux lignes `Review`. `ReviewEvent` est ainsi préservé. Mêmes valeurs par défaut que `reset-stats/route.ts` pour rester cohérent.

---

## 2026-05-18 — Leaderboard VeryFastMath instable en cas d'égalité de scores

### Symptôme
Deux utilisateurs avec le même score VFM voient leurs rangs s'inverser aléatoirement à chaque rafraîchissement de la page leaderboard.

### Cause racine
`app/api/veryfastmath/leaderboard/route.ts:58` triait uniquement par `b.score - a.score`. Pour des scores égaux, l'ordre dépendait de l'ordre d'itération de la `Map` JavaScript (insertion order) qui est lui-même fonction de l'ordre de retour de la requête SQL non déterministe pour les égalités.

### Solution implémentée
Tie-breaker par `createdAt` ascendant (le premier à atteindre ce score est ranké plus haut) : `if (b[1].score !== a[1].score) return b[1].score - a[1].score; return a[1].createdAt.getTime() - b[1].createdAt.getTime();`.

---

## 2026-05-18 — Synchronisation deck importé : N+1 sur l'ajout de cartes

### Symptôme
Quand un admin ajoute des cartes à un deck public, la synchronisation vers tous les decks importés des utilisateurs prend un temps proportionnel à `nb_decks_importés × nb_cartes_ajoutées` à cause d'une requête par carte.

### Cause racine
`lib/sync-decks.ts:309` utilisait une boucle `for (const sourceCard of cardsToAdd) await tx.card.create(...)`. Chaque création était une requête SQL indépendante.

### Solution implémentée
Batch en deux temps dans la transaction : un `tx.card.createMany({ data })` pour insérer toutes les cartes d'un coup, puis `tx.card.findMany` pour récupérer leurs IDs par `order`, puis `tx.review.createMany` pour insérer les Review associées. Réduit de N+1 à 3 requêtes constantes.

---

## 2026-05-18 — Audit transverse : autres corrections sécurisées en lot

Dans la même session, plusieurs corrections évidentes ont été appliquées sans incident majeur ; chacune mérite une mention rapide :

- **Validation email** (`signup`, `login`) : regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` + limite 254 chars.
- **Race signup** : catch `P2002` Prisma pour message propre au lieu d'une erreur 500.
- **Erreur parsing import** : message générique côté client, détails loggés côté serveur (Z1-07).
- **Export deck** : `findUnique` → `findFirst` avec ownership explicite.
- **`swap-all`** : N requêtes → 1 `$executeRaw UPDATE` atomique. Pour un deck de 500 cartes, ~500ms → ~5ms.
- **`TrueRetentionCard`** : affichage neutre `—` + label `N/A` si aucune carte mature (au lieu d'un score trompeur de 0% catalogué « Faible »).
- **`DeckHealthCard`** : segments non-vides garantis visibles (`minWidth: 6px`) — auparavant les buckets <5% disparaissaient et donnaient l'impression qu'il n'y avait aucune carte mature.
- **Admin `displayName`** : regex unicode (`/^[\p{L}\p{N} \-'._]+$/u`) bloque caractères de contrôle, RTL marks, ZWJ.
- **Rate-limit VFM `save-score`** : 10 requêtes/minute par user pour éviter le spam.
- **Type strict `sync-decks`** : `any` → `ContentType` Prisma.
- **`bulk-update-types`** : `any` → `Prisma.CardUpdateManyMutationInput`.
- **AddCards "Ajouter et continuer"** : `disabled={saving}` ajouté pour empêcher les doubles soumissions pendant l'upload.

Le détail complet des findings, des corrections, des faux positifs identifiés et des sujets différés est consigné dans `AUDIT.md`.

---

## 2026-05-08 — Mode Immédiate : cartes manquantes en révision

### Symptôme
Sur un deck de 6 cartes en mode Immédiate, seules 4 cartes apparaissent en rotation. Les classer "Facile" ne les fait pas disparaître pour autant — elles continuent de réapparaître. Les 2 cartes manquantes ne tombent jamais.

### Cause racine
Le composant `components/Review/ReviewV2.tsx` (lignes ~263-271) restaure le `baseDeck` cyclique depuis `localStorage` quand l'utilisateur reprend une session. La logique de synchronisation se contentait de :
1. Mapper chaque carte sauvegardée vers ses données fraîches
2. Filtrer les cartes qui n'existent plus dans le deck

Mais elle n'**ajoutait jamais** les cartes nouvellement créées dans le deck après le démarrage de la session. Conséquence : si la session a démarré quand le deck contenait 4 cartes, ajouter 2 cartes ensuite ne les fait pas apparaître à la reprise.

### Solution implémentée
Après le `.filter` qui élimine les cartes supprimées, on calcule le delta entre `data.cards` et le `syncedBaseDeck`, on mélange les nouvelles cartes (`shuffleArray`) et on les concatène en queue : `[...syncedBaseDeck, ...newCards]`. Fallback "démarrage frais" si le `finalBaseDeck` est vide après filtrage.

---

## 2026-05-08 — Statistiques temporelles : courbe et fenêtres glissantes faussées

### Symptôme
- La courbe de révision dans le temps affiche au plus 1 point par carte révisée par jour, alors qu'une carte peut être répondue plusieurs fois le même jour en mode Immédiate.
- Les indicateurs "réponses aujourd'hui / cette semaine" et `successRateThisWeek` ne reflètent pas le niveau réel de l'utilisateur quand il révise massivement un deck : les anciennes révisions polluent la fenêtre courante.

### Cause racine
La table `Review` est un agrégat par couple (carte, utilisateur) :
- `lastReview` est un timestamp écrasé à chaque nouvelle révision (la trace temporelle des anciennes révisions est perdue).
- `reps`, `againCount`, `hardCount`, `goodCount`, `easyCount` sont des cumuls all-time.

Les requêtes de statistiques (`app/api/decks/[id]/stats/route.ts` et `app/api/stats/global/route.ts`) interrogeaient cette table pour des fenêtres temporelles :
- `reviewHistory` : `COUNT(*) GROUP BY DATE(lastReview)` → un point par carte (pas par réponse) au jour de sa **dernière** review uniquement.
- `successRateThisWeek` : `SUM(goodCount + easyCount) / SUM(reps)` filtré par `lastReview >= weekAgo` → toutes les anciennes counts d'une carte étaient attribuées à la semaine si sa dernière review tombait dans la semaine.

La table `ReviewEvent` (un row par réponse, avec `createdAt` et `rating`, indexée `(userId, createdAt)`) existe déjà dans le schéma mais n'était utilisée que pour `avgTimePerCard` / `totalStudyTime`.

### Solution implémentée
Migration des requêtes temporelles vers `ReviewEvent` :
- `app/api/decks/[id]/stats/route.ts` :
  - `reviewHistoryRaw` : `COUNT(*) GROUP BY DATE(re.createdAt)` sur `ReviewEvent`.
  - `reviewComparison` : `reviewsToday`, `reviewsYesterday`, `reviewsThisWeek`, `reviewsPreviousWeek`, `successRateThisWeek`, `successRatePreviousWeek` calculés sur `ReviewEvent.createdAt` et `ReviewEvent.rating IN ('good','easy')`.
  - Sortie JSON : `reviewsToday` et `reviewsThisWeek` proviennent désormais de `comparison.*` (ReviewEvent) et non plus de `mainStats.*` (Review).
- `app/api/stats/global/route.ts` : `reviewsToday` calculé via `prisma.reviewEvent.count` au lieu de `prisma.review.count`.

Le `successRate` global all-time (`Review.goodCount + easyCount / reps`) est conservé : c'est un cumul, pas une fenêtre. Idem pour `difficultCards` / `masteredCards` (calculs par-carte).

### Leçon
Pour toute statistique sur une fenêtre temporelle, utiliser `ReviewEvent` (granulaire). Réserver `Review` aux indicateurs all-time par carte.

---

## 2026-05-08 — Reset deck supprime l'historique du leaderboard et de l'admin

### Symptôme
La fonctionnalité "Réinitialiser les statistiques d'un deck" supprime aussi les révisions correspondantes des données utilisées par le leaderboard global et le dashboard admin (compteur total de révisions de l'utilisateur). Les données sont définitivement perdues.

### Cause racine
La route `app/api/decks/[id]/reset-stats/route.ts` (lignes 42-49) faisait :
```ts
await prisma.review.deleteMany({
  where: { userId: user.id, card: { deckId } },
});
```

Or, dans `prisma/schema.prisma:160`, la relation `ReviewEvent.review` est en `onDelete: Cascade`. Donc supprimer une ligne `Review` supprime tous les `ReviewEvent` qui la référencent.

Le leaderboard (`app/api/leaderboard/route.ts:31-39`) et le dashboard admin (`app/admin/page.tsx:38` via `_count.reviewEvents`) lisent précisément `ReviewEvent` pour compter les révisions globales d'un utilisateur. Conséquence : reset d'un deck = perte de l'historique global pour ce deck.

### Solution implémentée
Remplacement de `deleteMany` par `updateMany` qui remet les compteurs à zéro sans supprimer les lignes `Review` :
```ts
await prisma.review.updateMany({
  where: { userId: user.id, card: { deckId } },
  data: {
    reps: 0, againCount: 0, hardCount: 0, goodCount: 0, easyCount: 0,
    lastReview: null, interval: null, nextReview: null,
    easeFactor: 2.5, status: 'NEW',
  },
});
```

Les lignes `Review` étant conservées, leurs `ReviewEvent` associés ne sont jamais cascade-deletés. Le leaderboard et l'admin restent intacts. La page stats du deck affiche bien 0 partout (les cumuls sont à 0 et `lastReview` est null).

### Leçon
Pour une fonction de "reset" qui ne doit toucher qu'un sous-ensemble logique des données, utiliser `UPDATE` plutôt que `DELETE` dès qu'il existe des relations `onDelete: Cascade` vers d'autres tables qui sont la source de vérité d'autres écrans.

---

## 2026-05-08 — Service Worker servait des bundles JS et des réponses API obsolètes

### Symptôme
Après un déploiement, l'utilisateur continuait à voir l'ancien comportement de l'application, même après un rafraîchissement avec vidage du cache navigateur. Le bug "4 cartes sur 6" persistait alors qu'une correction avait été déployée. Seule la procédure DevTools → Application → "Effacer les données du site" + reload résolvait le problème.

### Cause racine
`public/sw.js` (version `mindup-v1`) appliquait une stratégie de cache trop agressive : à chaque requête GET, il mettait en cache la réponse (`cache.put(event.request, responseToCache)`), sans distinction entre :
- les routes API `/api/*` (qui doivent être fraîches),
- les navigations HTML (qui pointent vers les bundles JS courants),
- les bundles Next.js (déjà cache-bustés via leur hash),
- les assets statiques (manifest, favicons).

Conséquences :
- Le HTML cachable contenait des références aux anciens hash de bundles → après un déploiement, le SW pouvait servir un HTML stale qui réclamait des fichiers JS qui ne correspondaient plus à la version courante.
- Les routes API renvoyaient parfois des réponses cachées (par ex. `/api/review` avec d'anciennes cartes ou d'anciennes stats).
- L'erreur `Manifest: Line 1, column 1, Syntax error` en console venait du même mécanisme : le SW avait probablement caché une réponse HTML (page d'erreur ou redirect) à la place du JSON `manifest.json`.

### Solution implémentée
Réécriture complète de `public/sw.js` avec une stratégie distinguant les types de ressources :
- **Précache à l'install** : uniquement les assets fixes (manifest, favicons, logos).
- **`/api/*`** : aucun handler, le SW ne touche pas — toujours réseau frais.
- **Navigations HTML** (`request.mode === 'navigate'`) : network-first avec fallback `OFFLINE_URL` uniquement en cas d'échec réseau.
- **`/_next/*`** : aucun handler, le browser gère son cache HTTP normal (les bundles ont déjà un hash unique).
- **Reste** : cache-first sur les assets précachés, sinon réseau.

`CACHE_NAME` bumpé de `mindup-v1` à `mindup-v2` pour forcer la suppression de l'ancien cache à l'activation du nouveau SW.

### Leçon
Un Service Worker qui cache aveuglément toutes les réponses GET est un piège récurrent. Règles à appliquer :
- Ne **jamais** cacher les routes API en runtime.
- Ne pas cacher le HTML de navigation autrement qu'avec un fallback offline.
- Laisser les assets versionnés (Next.js `_next/static/*`) au cache HTTP du browser (déjà optimal).
- Bumper `CACHE_NAME` à chaque modification structurelle du SW pour forcer l'invalidation côté clients.

---

## Migration FSRS-5 : migration Prisma manquante (16/05/2026)

### Symptôme
Après le commit `528cf9d` (migration SM-2 → FSRS-5), `prisma/schema.prisma` contenait les nouveaux champs (`stability`, `difficulty`, `lapses`, valeur enum `RELEARNING`, `newCardsPerDay`, `maxReviewsPerDay`) mais le dossier `prisma/migrations/` n'avait pas de fichier de migration correspondant. Toute requête FSRS en production aurait planté avec `column "stability" does not exist` ou `invalid input value for enum "CardStatus": "RELEARNING"`.

### Cause racine
Le commit a probablement été testé localement avec `prisma db push` (qui synchronise le schéma sans créer de migration) au lieu de `prisma migrate dev` qui génère le `.sql` versionné.

### Solution implémentée
Création manuelle de `prisma/migrations/20260516000000_add_fsrs5_fields/migration.sql` avec :
- `ALTER TYPE "CardStatus" ADD VALUE 'RELEARNING';`
- `ALTER TABLE "Review" ADD COLUMN "stability"/"difficulty"/"lapses"` avec leurs défauts.
- `ALTER TABLE "Deck" ADD COLUMN "newCardsPerDay" DEFAULT 20, "maxReviewsPerDay" DEFAULT 200;`
- Ajout du `migration_lock.toml` manquant (`provider = "postgresql"`).

### Leçon
**Toujours** utiliser `prisma migrate dev --name <description>` plutôt que `db push` quand on modifie le schéma sur une branche destinée au déploiement. `db push` ne génère pas de SQL versionné et brise la chaîne de migration en prod.

---

## Reset stats : champs FSRS non réinitialisés (16/05/2026)

### Symptôme
Après avoir réinitialisé les statistiques d'un deck ANKI, la première carte révisée recevait un intervalle aberrant (parfois plusieurs centaines de jours dès la première note "Good").

### Cause racine
`app/api/decks/[id]/reset-stats/route.ts` remettait `status = 'NEW'` mais conservait les anciennes valeurs de `stability`, `difficulty` et `lapses`. Le scheduler FSRS-5 utilise ces trois champs comme état d'entrée — il calculait donc l'intervalle suivant à partir d'un état "REVIEW maîtrisée" malgré le `status = 'NEW'` affiché côté UI.

### Solution implémentée
Ajout de `stability: 0, difficulty: 0, lapses: 0` dans le `data:` du `prisma.review.updateMany` du reset (`app/api/decks/[id]/reset-stats/route.ts:50-62`).

### Leçon
Quand on étend un modèle de données utilisé par un algorithme (FSRS lit 3 champs en plus de `status`), **toujours auditer tous les endpoints qui réinitialisent ou clonent ce modèle**. Un reset partiel laisse l'algorithme dans un état incohérent.

---

## Cartes legacy SM-2 corrompues par FSRS-5 (16/05/2026)

### Symptôme
Sur un deck ANKI créé avant la migration FSRS-5, les cartes déjà étudiées (status `LEARNING` ou `REVIEW`) produisaient au premier rating sous FSRS-5 un `interval` aberrant (parfois `NaN`, parfois plusieurs milliers de jours ou 0), avec un risque de stocker `stability = NaN` / `difficulty = NaN` en base — corrompant définitivement la carte.

### Cause racine
Les cartes héritées de SM-2 ont :
- `status = 'LEARNING'` ou `'REVIEW'` (ancien classement SM-2)
- `interval`, `easeFactor`, `nextReview` calibrés SM-2
- **`stability = 0`, `difficulty = 0`** (valeurs par défaut de la migration FSRS-5)

`ts-fsrs` reçoit alors un état impossible : `state ≠ New` mais `stability = 0`. La formule de retrievability `R = exp(-elapsed / stability)` devient `exp(-elapsed / 0) = exp(-Infinity) = 0` ou `NaN` selon l'implémentation. Le scheduler propage la valeur jusqu'aux champs de sortie.

### Solution implémentée
Détection dans `lib/anki.ts:updateAnkiReviewStats` :
```ts
const isLegacy =
  currentStats.stability === 0 &&
  (currentStats.status !== 'NEW' || currentStats.reps > 0);

const card = isLegacy
  ? createEmptyCard(now)  // Re-initialise via init_stability(grade)
  : { /* état FSRS normal */ };
```

Au retour, les compteurs historiques (`reps`, `*Count`, `lapses`) sont préservés et incrémentés manuellement, FSRS ne gère que le scheduling (`stability`, `difficulty`, `interval`, `nextReview`, `status`).

**Coût** : sur les cartes déjà avancées en SM-2, la première révision FSRS donne un intervalle court (~1 jour pour `good`), puis le scheduler reprend la main normalement à partir de la seconde révision.

### Leçon
Quand un algorithme change d'état interne (SM-2 → FSRS-5), **les valeurs par défaut de la migration SQL sont un piège**. `stability DEFAULT 0` est syntaxiquement valide mais sémantiquement invalide pour `state ≠ New`. Trois options possibles à l'avenir :
1. Migration de données : initialiser `stability/difficulty` depuis `interval/easeFactor` (calcul inverse approximatif).
2. Reset forcé : passer `status = 'NEW'` pour toutes les cartes lors de la migration (perte de progression visible).
3. Détection runtime (choix retenu ici) : repérer l'état incohérent dans le code applicatif.

L'option 3 est la plus sûre car réversible et n'impose pas de fenêtre de downtime.

---

## ReviewV1 : cartes ajoutées invisibles en session IMMEDIATE (16/05/2026)

### Symptôme
Sur le dashboard V1, en mode IMMEDIATE, ajouter une carte au deck pendant une session en cours ne la faisait pas apparaître après reload de la page de révision (alors que V2 l'affichait correctement).

### Cause racine
Lors d'un audit `Projet.md` de mai 2026, la correction "réinjection des nouvelles cartes" avait été appliquée à `ReviewV2.tsx` mais oubliée dans `ReviewV1.tsx`. V1 se contentait de filtrer les cartes supprimées sans ajouter celles ajoutées au deck.

### Solution implémentée
Recopie dans `ReviewV1.tsx:268-298` de la logique de V2 :
- `syncedIds = new Set(...)` puis `newCards = data.cards.filter(c => !syncedIds.has(c.id))`.
- Reconstitution `finalBaseDeck = [...syncedBaseDeck, ...newCards]`.
- Fallback "démarrage frais" si `finalBaseDeck.length === 0`.

### Leçon
Quand deux composants partagent une logique (V1/V2 du même flux), toute correction doit être appliquée aux deux **en même temps**. Idéalement, extraire la logique partagée dans un hook ou un util (`/lib/session-restore.ts`) pour éviter ces divergences.

---

## Import Anki : SQLite invisible alors qu'il existe (16/05/2026)

### Symptôme
À l'inspection d'un `.apkg` moderne (Anki ≥ 2.1.50), la table `notes` de `collection.anki2` ne contenait qu'**une seule note** alors que le deck en contenait 10. Les autres tables (`cards`, `revlog`) étaient également quasi-vides ou n'avaient pas les bonnes colonnes (pas de `deck_config`, `notetypes`, `fields`, `templates`).

### Cause racine
Depuis Anki 2.1.50, l'export `.apkg` contient **deux fichiers SQLite** :
- `collection.anki2` : **squelette legacy** maintenu pour la rétro-compatibilité avec les vieilles versions d'AnkiDroid/Anki. Contient un schéma minimal mais pas les vraies données.
- `collection.anki21b` : SQLite **réel**, compressé en Zstandard (magic bytes `28 b5 2f fd`). Contient toutes les notes, cartes, revlog et le schéma moderne (`deck_config`, `notetypes`, `fields`, etc.).

Un parser qui ouvre directement `collection.anki2` sans vérifier la présence de `collection.anki21b` lit donc des données vides ou incomplètes.

### Solution implémentée
Dans `lib/parsers/apkg.ts` → `extractSqliteBuffer()`, ordre de priorité strict :
1. `collection.anki21b` (zstd) — Anki ≥ 2.1.50, source de vérité moderne
2. `collection.anki21` (SQLite brut) — fallback intermédiaire
3. `collection.anki2` (SQLite brut) — fallback ultime pour les très vieux exports

La décompression zstd utilise `fzstd` (pure JS, compatible Vercel serverless). Important : `fzstd.decompress()` accepte un `Uint8Array` et retourne un `Uint8Array` ; éviter `zstandard.decompress()` côté Python avec frames sans content size (utiliser `stream_reader` à la place).

### Leçon
Pour les formats binaires propriétaires, toujours valider la structure réelle avec un échantillon avant d'écrire le parser. Ici, un `sqlite3 collection.anki2 ".tables"` montrait `COUNT=1` alors que le deck en contenait 10 — indice immédiat qu'on lisait le mauvais fichier.
