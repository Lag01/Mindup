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
