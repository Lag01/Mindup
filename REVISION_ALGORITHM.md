# Documentation du système de révision immédiate

## Table des matières

1. [Introduction](#introduction)
2. [Guide utilisateur](#guide-utilisateur)
3. [Documentation technique](#documentation-technique)
4. [Implémentation dans le projet](#implémentation-dans-le-projet)
5. [Références](#références)

---

## Introduction

### Qu'est-ce que la révision immédiate ?

**La révision immédiate** est un système de flashcards qui permet de réviser en **session continue et infinie**, sans limite de temps ni restriction par intervalles de jours. Contrairement aux systèmes classiques de révision espacée (comme FSRS ou SM-2), ce système fonctionne avec une **file dynamique** qui s'adapte en temps réel à vos réponses.

### Concepts clés

- **Session infinie** : Vous pouvez réviser aussi longtemps que vous voulez, sans jamais voir le message "Aucune carte à réviser"
- **File dynamique** : Les cartes reviennent dans la session selon votre performance
- **Feedback immédiat** : Si vous échouez une carte, elle revient rapidement dans les prochaines cartes à réviser
- **Rotation équilibrée** : Même si vous maîtrisez toutes les cartes, le système continue de les faire tourner pour renforcer votre mémoire

### Pourquoi ce système ?

1. **Pas de frustration** : Plus de message "Revenez demain"
2. **Apprentissage intensif** : Révisez autant que vous voulez en une session
3. **Feedback rapide** : Les difficultés remontent vite pour être retravaillées
4. **Souplesse totale** : Vous décidez quand arrêter, pas l'algorithme

---

## Guide utilisateur

### Les 4 boutons de révision

Lorsque vous révisez une carte, vous devez évaluer votre performance en choisissant l'un des 4 boutons. **Votre choix détermine dans combien de cartes celle-ci reviendra.**

#### 🔴 **Échec** (Again)
**Quand l'utiliser** : Vous ne vous souvenez pas de la réponse, ou votre réponse est incorrecte.

**Ce qui se passe** :
- La carte revient dans **3 cartes**
- Vos statistiques d'échec augmentent
- La carte sera revue très rapidement

**Exemple** : Vous révisez une formule mathématique et vous ne vous en souvenez pas du tout.

---

#### 🟠 **Difficile** (Hard)
**Quand l'utiliser** : Vous avez trouvé la réponse, mais après beaucoup d'efforts, d'hésitation ou avec des erreurs mineures.

**Ce qui se passe** :
- La carte revient dans **8 cartes**
- Vos statistiques "Difficile" augmentent
- La carte sera revue bientôt

**Exemple** : Vous révisez une date historique et vous hésitez entre deux années avant de trouver la bonne.

---

#### 🟢 **Bien** (Good)
**Quand l'utiliser** : Vous vous souvenez de la réponse correctement, avec un effort raisonnable.

**Ce qui se passe** :
- La carte revient dans **15 cartes**
- Vos statistiques "Bien" augmentent
- C'est le choix par défaut recommandé

**Exemple** : Vous révisez un mot de vocabulaire et vous vous en souvenez après quelques secondes de réflexion.

---

#### 🔵 **Facile** (Easy)
**Quand l'utiliser** : Vous vous souvenez de la réponse immédiatement, sans aucun effort, avec une grande confiance.

**Ce qui se passe** :
- La carte revient dans **30 cartes**
- Vos statistiques "Facile" augmentent
- La carte reviendra beaucoup plus tard dans la session

**Exemple** : Vous révisez votre propre prénom - vous le savez instantanément sans réfléchir.

---

### Tableau récapitulatif des intervalles

| Rating | Intervalle (en cartes) | Quand l'utiliser |
|--------|------------------------|------------------|
| 🔴 Échec | **3 cartes** | Réponse incorrecte ou oubliée |
| 🟠 Difficile | **8 cartes** | Réponse correcte mais difficile |
| 🟢 Bien | **15 cartes** | Réponse correcte avec effort normal |
| 🔵 Facile | **30 cartes** | Réponse immédiate et certaine |

---

### Comment fonctionne la session ?

#### 1. Démarrage de la session

Lorsque vous cliquez sur "Réviser", **toutes les cartes du deck** sont chargées et mises dans une file d'attente.

#### 2. Révision d'une carte

1. Vous voyez le **recto** de la carte
2. Vous cliquez sur **"Retourner"**
3. Vous voyez le **verso** avec le recto
4. Vous choisissez un **rating** (Échec / Difficile / Bien / Facile)

#### 3. Réinsertion dynamique

La carte est **retirée** de la file, puis **réinsérée** à la position correspondant à votre rating :

```
File avant révision : [Carte A, Carte B, Carte C, Carte D, Carte E, Carte F]
Vous révisez Carte A avec rating "Difficile" (intervalle = 8)

File après révision : [Carte B, Carte C, Carte D, Carte E, Carte F, Carte G, Carte H, Carte I, Carte A]
                                                                                        ↑
                                                                    Carte A revient ici (position 8)
```

#### 4. Fin de la file

Quand toutes les cartes ont été révisées et que la file est vide, **elle se recharge automatiquement** avec toutes les cartes du deck. La session continue indéfiniment !

---

### Statistiques de session

En haut de l'écran de révision, vous voyez :

- **Nombre total de cartes révisées** : Compteur qui augmente à chaque révision
- **Statistiques par rating** :
  - 🔴 Échec : Nombre de fois où vous avez échoué
  - 🟠 Difficile : Nombre de cartes difficiles
  - 🟢 Bien : Nombre de cartes réussies normalement
  - 🔵 Facile : Nombre de cartes faciles

Ces statistiques vous permettent de suivre votre progression pendant la session.

---

### Conseils d'utilisation

#### ⚖️ Soyez honnête avec vous-même

Le système ne fonctionne que si vous évaluez correctement votre performance. Ne trichez pas en mettant tout en "Facile" !

#### 📊 Répartition recommandée

Pour un apprentissage optimal :
- **Échec** : 5-10%
- **Difficile** : 15-25%
- **Bien** : 50-60%
- **Facile** : 10-20%

#### ⚠️ Erreurs courantes

1. **Trop de "Facile"** : Vous risquez de ne pas assez renforcer votre mémoire
2. **Jamais de "Échec"** : Soyez honnête quand vous ne savez pas
3. **Sessions trop longues** : Faites des pauses ! 30-45 minutes max par session

---

## Documentation technique

### Architecture du système

Le système de révision immédiate repose sur une **file dynamique** gérée côté client, synchronisée avec une base de données côté serveur.

```
┌────────────────────────────────────────┐
│  Client (React)                         │
│  - cardQueue: Card[]  (file dynamique) │
│  - currentCard: Card  (carte affichée) │
│  - sessionStats       (stats de session)│
└────────────┬───────────────────────────┘
             │
             ↓ Soumission de rating
┌────────────────────────────────────────┐
│  API /api/review (Next.js)              │
│  - POST: Met à jour les statistiques   │
│  - GET: Récupère toutes les cartes     │
└────────────┬───────────────────────────┘
             │
             ↓ Mise à jour
┌────────────────────────────────────────┐
│  Base de données (PostgreSQL)           │
│  - Review.reps        (nombre total)    │
│  - Review.againCount  (stats échec)     │
│  - Review.hardCount   (stats difficile) │
│  - Review.goodCount   (stats bien)      │
│  - Review.easyCount   (stats facile)    │
└────────────────────────────────────────┘
```

---

### Algorithme de file dynamique

#### Fonction : `insertCardInQueue`

Cette fonction est au cœur du système. Elle réinsère une carte dans la file à la bonne position.

```typescript
function insertCardInQueue<T>(
  queue: T[],      // File actuelle
  card: T,         // Carte à réinsérer
  rating: Rating   // Évaluation ('again' | 'hard' | 'good' | 'easy')
): T[] {
  const newQueue = [...queue];
  const position = calculateInsertPosition(rating, newQueue.length);
  newQueue.splice(position, 0, card);
  return newQueue;
}
```

#### Fonction : `calculateInsertPosition`

Calcule la position d'insertion selon le rating.

```typescript
const REVISION_INTERVALS = {
  again: 3,    // Revient dans 3 cartes
  hard: 8,     // Revient dans 8 cartes
  good: 15,    // Revient dans 15 cartes
  easy: 30,    // Revient dans 30 cartes
};

function calculateInsertPosition(
  rating: Rating,
  currentQueueLength: number
): number {
  const interval = REVISION_INTERVALS[rating];

  // La position est le minimum entre l'intervalle et la longueur de la file
  return Math.min(interval, currentQueueLength);
}
```

**Pourquoi `Math.min` ?**

Si la file contient seulement 10 cartes et que vous mettez "Facile" (intervalle 30), la carte est insérée à la fin (position 10), pas à la position 30 (qui n'existe pas).

---

### Flux de données

#### 1. Initialisation de la session

```typescript
useEffect(() => {
  fetchCards();
}, [deckId]);

const fetchCards = async () => {
  const response = await fetch(`/api/review?deckId=${deckId}`);
  const data = await response.json();

  // Charger toutes les cartes
  setAllCards(data.cards);
  setCardQueue(data.cards);
  setCurrentCard(data.cards[0]);
};
```

#### 2. Soumission d'un rating

```typescript
const handleRating = async (rating: Rating) => {
  // 1. Soumettre à l'API
  await fetch('/api/review', {
    method: 'POST',
    body: JSON.stringify({ cardId: currentCard.id, rating }),
  });

  // 2. Mettre à jour les stats de session
  setSessionStats(prev => ({
    ...prev,
    total: prev.total + 1,
    [rating + 'Count']: prev[rating + 'Count'] + 1,
  }));

  // 3. Retirer la carte actuelle de la file
  const remainingQueue = cardQueue.slice(1);

  // 4. Réinsérer la carte à la bonne position
  const newQueue = insertCardInQueue(remainingQueue, currentCard, rating);

  // 5. Si la file est vide, recharger toutes les cartes
  if (newQueue.length === 0) {
    setCardQueue(allCards);
    setCurrentCard(allCards[0]);
  } else {
    setCardQueue(newQueue);
    setCurrentCard(newQueue[0]);
  }
};
```

#### 3. Mise à jour côté serveur

```typescript
// app/api/review/route.ts

export async function POST(request: NextRequest) {
  const { cardId, rating } = await request.json();

  // Récupérer ou créer la review
  let review = await prisma.review.findUnique({
    where: { cardId_userId: { cardId, userId } }
  });

  if (!review) {
    review = await prisma.review.create({
      data: { cardId, userId, ...createNewReviewStats() }
    });
  }

  // Mettre à jour les statistiques
  const newStats = updateReviewStats(review, rating);

  await prisma.review.update({
    where: { cardId_userId: { cardId, userId } },
    data: newStats
  });

  return NextResponse.json({ success: true });
}
```

---

### Modèle de données

#### Table `Review` (Prisma Schema)

```prisma
model Review {
  id          String    @id @default(cuid())
  cardId      String
  userId      String

  // Statistiques de révision
  reps        Int       @default(0)        // Nombre total de révisions
  againCount  Int       @default(0)        // Nombre de "Échec"
  hardCount   Int       @default(0)        // Nombre de "Difficile"
  goodCount   Int       @default(0)        // Nombre de "Bien"
  easyCount   Int       @default(0)        // Nombre de "Facile"
  lastReview  DateTime?                    // Dernière révision

  // Métadonnées
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  card        Card      @relation(fields: [cardId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@unique([cardId, userId])
  @@index([userId])
}
```

**Comparaison avec l'ancien système FSRS** :

| Ancien (FSRS) | Nouveau (Révision immédiate) |
|---------------|------------------------------|
| `due: DateTime` | ❌ Supprimé |
| `stability: Float` | ❌ Supprimé |
| `difficulty: Float` | ❌ Supprimé |
| `elapsedDays: Int` | ❌ Supprimé |
| `scheduledDays: Int` | ❌ Supprimé |
| `learningSteps: Int` | ❌ Supprimé |
| `state: Int` | ❌ Supprimé |
| `lapses: Int` | ✅ Remplacé par `againCount` |
| `reps: Int` | ✅ Conservé |
| - | ✅ Nouveau : `hardCount` |
| - | ✅ Nouveau : `goodCount` |
| - | ✅ Nouveau : `easyCount` |

---

### Calcul du taux de réussite

```typescript
function calculateSuccessRate(stats: ReviewStats): number {
  if (stats.reps === 0) return 0;

  const successCount = stats.goodCount + stats.easyCount;
  return Math.round((successCount / stats.reps) * 100);
}
```

**Interprétation** :
- Taux de réussite = Pourcentage de révisions avec "Bien" ou "Facile"
- Un taux de 70-80% est généralement bon
- Un taux < 50% indique que le matériel est trop difficile

---

## Implémentation dans le projet

### Fichiers clés

#### 1. `lib/revision.ts`

Contient toute la logique de révision immédiate.

**Fonctions principales** :

- `createNewReviewStats()` : Crée des statistiques initiales pour une nouvelle carte
- `updateReviewStats(stats, rating)` : Met à jour les statistiques après une révision
- `calculateInsertPosition(rating, queueLength)` : Calcule où insérer une carte
- `insertCardInQueue(queue, card, rating)` : Insère une carte dans la file
- `calculateSuccessRate(stats)` : Calcule le taux de réussite

**Constantes** :

```typescript
export const REVISION_INTERVALS: Record<Rating, number> = {
  again: 3,
  hard: 8,
  good: 15,
  easy: 30,
};
```

---

#### 2. `app/api/review/route.ts`

API Route pour gérer les révisions.

**GET /api/review?deckId=xxx**

Retourne **toutes les cartes** du deck (pas de filtre par date).

```typescript
const cards = await prisma.card.findMany({
  where: { deckId },
  include: { reviews: { where: { userId } } },
  orderBy: { order: 'asc' },
});
```

**POST /api/review**

Met à jour les statistiques de révision.

```typescript
const newStats = updateReviewStats(currentReview, rating);
await prisma.review.update({
  where: { cardId_userId: { cardId, userId } },
  data: newStats
});
```

---

#### 3. `app/deck/[id]/review/page.tsx`

Interface utilisateur pour les révisions.

**États principaux** :

```typescript
const [allCards, setAllCards] = useState<Card[]>([]);        // Toutes les cartes
const [cardQueue, setCardQueue] = useState<Card[]>([]);      // File dynamique
const [currentCard, setCurrentCard] = useState<Card | null>(null); // Carte actuelle
const [sessionStats, setSessionStats] = useState({ ... });   // Stats de session
```

**Logique de révision** :

```typescript
const handleRating = async (rating: Rating) => {
  // 1. Soumettre à l'API
  await fetch('/api/review', { method: 'POST', body: JSON.stringify({ cardId, rating }) });

  // 2. Mise à jour des stats
  setSessionStats(prev => ({ ...prev, [rating]: prev[rating] + 1 }));

  // 3. Réinsertion dynamique
  const remainingQueue = cardQueue.slice(1);
  const newQueue = insertCardInQueue(remainingQueue, currentCard, rating);

  // 4. Gestion de la file vide
  if (newQueue.length === 0) {
    setCardQueue(allCards);
    setCurrentCard(allCards[0]);
  } else {
    setCardQueue(newQueue);
    setCurrentCard(newQueue[0]);
  }
};
```

---

#### 4. `app/api/decks/[id]/cards/route.ts`

Création de cartes avec statistiques initiales.

```typescript
const newStats = createNewReviewStats();
await prisma.review.create({
  data: {
    cardId: createdCard.id,
    userId: user.id,
    ...newStats
  }
});
```

---

#### 5. `app/api/import/route.ts`

Import de decks avec création des reviews.

```typescript
const newStats = createNewReviewStats();
const reviewsData = createdDeck.cards.map(card => ({
  cardId: card.id,
  userId: user.id,
  ...newStats
}));
await prisma.review.createMany({ data: reviewsData });
```

---

### Avantages du nouveau système

#### ✅ Simplicité

- Moins de code (suppression de FSRS)
- Moins de colonnes en base de données
- Logique plus facile à comprendre

#### ✅ Flexibilité

- Sessions infinies
- Pas de blocage par manque de cartes
- L'utilisateur contrôle la durée

#### ✅ Performance

- File gérée côté client (pas de requêtes répétées)
- Une seule requête API par révision
- Rechargement de la file uniquement quand vide

#### ✅ Feedback immédiat

- Les cartes échouées reviennent vite
- Renforcement rapide des faiblesses
- Pas d'attente de lendemain

---

### Optimisations

1. **Gestion de la file côté client** : Évite des allers-retours serveur
2. **Rechargement automatique** : La file se recharge quand vide
3. **Statistiques de session** : Calcul local, pas de requête
4. **Index de base de données** : `@@index([userId])` pour accès rapide

---

## Références

### Documentation du projet

- `README.md` : Documentation générale de l'application
- `prisma/schema.prisma` : Schéma de base de données complet

### Bibliothèques utilisées

- **React** : Gestion de la file dynamique côté client
- **Next.js** : API Routes pour les révisions
- **Prisma** : ORM pour la persistance des données
- **PostgreSQL** : Base de données relationnelle

### Articles et ressources

1. **Queue Data Structure** : [Wikipedia](https://en.wikipedia.org/wiki/Queue_(abstract_data_type))
2. **Array.splice() method** : [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice)
3. **React useState Hook** : [React Docs](https://react.dev/reference/react/useState)

---

## Glossaire

- **Rating** : Évaluation de votre performance (Again, Hard, Good, Easy)
- **File dynamique** : Liste de cartes qui se réorganise selon vos réponses
- **Intervalle** : Nombre de cartes après lequel une carte revient
- **Session** : Période de révision continue jusqu'à ce que vous quittiez
- **Statistiques de session** : Compteurs locaux pendant la session en cours
- **Statistiques globales** : Données persistées en base de données

---

## FAQ

### Q: Que se passe-t-il si je mets tout en "Facile" ?

**R:** La carte reviendra dans 30 cartes. Si votre deck a 20 cartes, elle reviendra à la fin du cycle. Le système continue de tourner.

### Q: Puis-je vraiment réviser à l'infini ?

**R:** Oui ! La file se recharge automatiquement quand elle est vide. Mais attention à la fatigue cognitive : faites des pauses.

### Q: Les statistiques sont-elles sauvegardées ?

**R:** Oui, chaque révision met à jour les statistiques en base de données. Les stats de session sont locales.

### Q: Pourquoi 3, 8, 15, 30 cartes ?

**R:** Ces intervalles sont choisis pour :
- Éviter les boucles infinies sur une partie du deck
- Donner un feedback rapide sur les échecs
- Espacer progressivement les cartes faciles
- Maintenir une rotation équilibrée

### Q: Puis-je changer les intervalles ?

**R:** Oui, modifiez la constante `REVISION_INTERVALS` dans `lib/revision.ts`.

---

*Documentation créée le 2025-01-15*
*Dernière mise à jour : 2025-01-15*
*Version de l'application : 2.0.0*
*Système de révision : Immédiat (remplace FSRS)*
