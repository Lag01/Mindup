# Log des erreurs résolues

Ce fichier consigne les bugs rencontrés sur l'application, leur cause racine et la solution implémentée. Avant de corriger une erreur similaire, consulter ce fichier.

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
