# Documentation de l'algorithme FSRS

## Table des matières

1. [Introduction](#introduction)
2. [Guide utilisateur](#guide-utilisateur)
3. [Documentation technique](#documentation-technique)
4. [Implémentation dans le projet](#implémentation-dans-le-projet)
5. [Références](#références)

---

## Introduction

### Qu'est-ce que FSRS ?

**FSRS (Free Spaced Repetition Scheduler)** est un algorithme moderne de révision espacée développé pour optimiser l'apprentissage à long terme. Il s'agit d'une alternative scientifiquement validée aux algorithmes classiques comme SM-2 (utilisé par Anki) ou Leitner.

### Pourquoi FSRS est-il meilleur ?

FSRS présente plusieurs avantages par rapport aux algorithmes classiques :

1. **Basé sur des données réelles** : FSRS utilise des millions de données de révision pour optimiser ses paramètres
2. **Adaptatif** : Il s'adapte au comportement d'apprentissage individuel de chaque utilisateur
3. **Précision supérieure** : Il prédit mieux la probabilité de mémorisation qu'Anki SM-2 (amélioration de ~20%)
4. **Open source** : L'algorithme est transparent et continuellement amélioré par la communauté

### Concepts clés

- **Révision espacée** : Technique d'apprentissage qui consiste à réviser l'information juste avant de l'oublier
- **Courbe d'oubli** : Modèle décrivant comment la mémoire décline avec le temps
- **Stabilité** : Durée pendant laquelle vous pouvez vous souvenir d'une information avec 90% de probabilité
- **Difficulté** : Mesure de la facilité ou de la difficulté d'une carte spécifique

---

## Guide utilisateur

### Les 4 boutons de révision

Lorsque vous révisez une carte, vous devez évaluer votre performance en choisissant l'un des 4 boutons :

#### 🔴 **Encore** (Again)
**Quand l'utiliser** : Vous ne vous souvenez pas de la réponse, ou votre réponse est incorrecte.

**Ce qui se passe** :
- La carte est marquée comme "oubliée"
- Le compteur de lapses (oublis) augmente
- La carte repasse en phase d'apprentissage
- L'intervalle de révision est fortement réduit
- La difficulté de la carte augmente

**Exemple** : Vous révisez une formule mathématique et vous ne vous en souvenez pas du tout.

---

#### 🟠 **Difficile** (Hard)
**Quand l'utiliser** : Vous avez trouvé la réponse, mais après beaucoup d'efforts, d'hésitation ou avec des erreurs mineures.

**Ce qui se passe** :
- Le compteur de répétitions augmente
- L'intervalle de révision augmente légèrement (moins que "Bien")
- La difficulté augmente légèrement
- La carte reste dans son état actuel

**Exemple** : Vous révisez une date historique et vous hésitez entre deux années avant de trouver la bonne.

---

#### 🟢 **Bien** (Good)
**Quand l'utiliser** : Vous vous souvenez de la réponse correctement, avec un effort raisonnable.

**Ce qui se passe** :
- Le compteur de répétitions augmente
- L'intervalle de révision augmente normalement
- La difficulté reste relativement stable
- C'est le choix par défaut recommandé

**Exemple** : Vous révisez un mot de vocabulaire et vous vous en souvenez après quelques secondes de réflexion.

---

#### 🔵 **Facile** (Easy)
**Quand l'utiliser** : Vous vous souvenez de la réponse immédiatement, sans aucun effort, avec une grande confiance.

**Ce qui se passe** :
- Le compteur de répétitions augmente
- L'intervalle de révision augmente significativement (plus que "Bien")
- La difficulté diminue
- La prochaine révision sera dans beaucoup plus longtemps

**Exemple** : Vous révisez votre propre prénom - vous le savez instantanément sans réfléchir.

---

### Comment choisir le bon bouton ?

#### ⚖️ Principe général

**Soyez honnête avec vous-même** : Le système ne fonctionne que si vous évaluez correctement votre performance.

#### 📊 Répartition recommandée

Pour un apprentissage optimal, votre répartition devrait ressembler à :
- **Encore** : 5-10% (si vous avez beaucoup de "Encore", le matériel est peut-être trop difficile)
- **Difficile** : 10-20%
- **Bien** : 50-70% (la majorité de vos révisions)
- **Facile** : 10-20% (utilisez-le avec parcimonie)

#### ⚠️ Erreurs courantes

1. **Trop de "Facile"** : Si vous marquez tout comme facile, vous risquez d'oublier
2. **Jamais de "Encore"** : Si vous n'utilisez jamais "Encore", vous n'êtes peut-être pas honnête
3. **Trop de "Encore"** : Si vous utilisez trop "Encore", décomposez vos cartes en concepts plus simples

---

### Impact sur les intervalles de révision

Voici des exemples d'intervalles typiques selon votre évaluation :

#### Nouvelle carte (jamais révisée)
- **Encore** : ~1 minute
- **Difficile** : ~10 minutes
- **Bien** : ~1 jour
- **Facile** : ~4 jours

#### Carte en révision (déjà vue plusieurs fois)
- **Encore** : Retour en apprentissage (~1 jour)
- **Difficile** : ~1.5x l'intervalle précédent
- **Bien** : ~2.5x l'intervalle précédent
- **Facile** : ~4x l'intervalle précédent

**Exemple concret** :
Si vous révisez une carte pour la 5ème fois et que l'intervalle précédent était de 30 jours :
- **Encore** : Retour à ~1-2 jours
- **Difficile** : ~45 jours
- **Bien** : ~75 jours
- **Facile** : ~120 jours

---

## Documentation technique

### Les paramètres FSRS

L'algorithme FSRS utilise plusieurs paramètres pour chaque carte afin de calculer les intervalles optimaux.

#### 1. **Stability (Stabilité)**
- **Type** : `Float` (nombre décimal)
- **Définition** : Nombre de jours pendant lesquels vous avez 90% de chances de vous souvenir de la carte
- **Plage** : 0 à ∞ (augmente avec chaque révision réussie)
- **Impact** : Détermine directement l'intervalle de révision

**Formule** :
```
Intervalle = Stability × ln(0.9) / ln(Retention)
```
Avec Retention = 0.9 (90% de rétention cible)

---

#### 2. **Difficulty (Difficulté)**
- **Type** : `Float` (nombre décimal)
- **Définition** : Mesure de la difficulté intrinsèque de la carte pour vous
- **Plage** : 1 à 10 (1 = très facile, 10 = très difficile)
- **Impact** : Influence la vitesse à laquelle la stabilité augmente

**Formule de mise à jour** :
```
New_Difficulty = Old_Difficulty + δ
```
Où δ dépend du rating :
- **Again** : δ ≈ +0.5 à +2.0
- **Hard** : δ ≈ +0.1 à +0.5
- **Good** : δ ≈ 0 (peu de changement)
- **Easy** : δ ≈ -0.1 à -0.5

---

#### 3. **Reps (Répétitions)**
- **Type** : `Int` (entier)
- **Définition** : Nombre total de fois que vous avez révisé cette carte
- **Plage** : 0 à ∞
- **Impact** : Utilisé pour les statistiques et le suivi de progression

---

#### 4. **Lapses (Oublis)**
- **Type** : `Int` (entier)
- **Définition** : Nombre de fois que vous avez oublié cette carte (bouton "Encore")
- **Plage** : 0 à ∞
- **Impact** : Augmente la difficulté et réduit la stabilité

---

#### 5. **State (État)**
- **Type** : `Int` (0, 1, 2, ou 3)
- **Définition** : Phase d'apprentissage actuelle de la carte
- **Valeurs possibles** :
  - **0 : New** (Nouvelle) - Jamais révisée
  - **1 : Learning** (En apprentissage) - Nouvellement apprise, intervalles courts
  - **2 : Review** (En révision) - Carte maîtrisée, intervalles longs
  - **3 : Relearning** (Réapprentissage) - Oubliée, doit être réapprise

**Transitions d'état** :
```
New (0) → Learning (1) [première révision]
Learning (1) → Review (2) [après plusieurs révisions réussies]
Review (2) → Relearning (3) [bouton "Encore"]
Relearning (3) → Review (2) [après révisions réussies]
```

---

#### 6. **Scheduled Days (Jours planifiés)**
- **Type** : `Int` (entier)
- **Définition** : Nombre de jours planifiés jusqu'à la prochaine révision
- **Plage** : 0 à ∞
- **Impact** : Calculé à partir de la stabilité

---

#### 7. **Elapsed Days (Jours écoulés)**
- **Type** : `Int` (entier)
- **Définition** : Nombre de jours depuis la dernière révision
- **Plage** : 0 à ∞
- **Impact** : Utilisé pour calculer la rétention actuelle

---

#### 8. **Learning Steps (Étapes d'apprentissage)**
- **Type** : `Int` (entier)
- **Définition** : Progression dans les étapes d'apprentissage initial
- **Plage** : 0 à nombre d'étapes configurées
- **Impact** : Détermine l'intervalle pour les nouvelles cartes

---

#### 9. **Due (Date de révision)**
- **Type** : `DateTime` (date et heure)
- **Définition** : Date et heure à laquelle la carte doit être révisée
- **Impact** : Détermine quand la carte apparaît dans la session de révision

---

#### 10. **Last Review (Dernière révision)**
- **Type** : `DateTime | null` (date et heure ou null)
- **Définition** : Date et heure de la dernière révision
- **Impact** : Utilisé pour calculer elapsed_days

---

### Formules mathématiques

#### Calcul de la stabilité

FSRS utilise un modèle complexe pour calculer la nouvelle stabilité après chaque révision :

```typescript
// Formule simplifiée
new_stability = old_stability × (1 + exp(w) × (rating_factor - 3) × difficulty_factor)
```

Où :
- `w` : Poids optimisé par l'algorithme
- `rating_factor` : 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
- `difficulty_factor` : Fonction de la difficulté actuelle

#### Calcul de l'intervalle

```typescript
interval = stability × request_retention
```

Où :
- `request_retention` : Rétention souhaitée (par défaut 0.9 pour 90%)

#### Calcul de la probabilité de rétention

```typescript
retention = exp(ln(0.9) × elapsed_days / stability)
```

---

### Algorithme de révision

Voici le pseudo-code du processus de révision :

```typescript
function reviewCard(card: Card, rating: Rating): Card {
  // 1. Récupérer les données actuelles de la carte
  const current_stability = card.stability
  const current_difficulty = card.difficulty
  const current_state = card.state

  // 2. Calculer la nouvelle difficulté
  const new_difficulty = calculateDifficulty(current_difficulty, rating)

  // 3. Calculer la nouvelle stabilité
  const new_stability = calculateStability(
    current_stability,
    current_difficulty,
    rating,
    card.elapsed_days
  )

  // 4. Calculer le nouvel intervalle
  const new_interval = calculateInterval(new_stability)

  // 5. Mettre à jour l'état
  const new_state = updateState(current_state, rating)

  // 6. Mettre à jour les compteurs
  const new_reps = card.reps + 1
  const new_lapses = rating === 'again' ? card.lapses + 1 : card.lapses

  // 7. Calculer la prochaine date de révision
  const new_due = new Date(Date.now() + new_interval * 86400000) // ms

  // 8. Retourner la carte mise à jour
  return {
    ...card,
    stability: new_stability,
    difficulty: new_difficulty,
    state: new_state,
    reps: new_reps,
    lapses: new_lapses,
    due: new_due,
    scheduled_days: new_interval,
    elapsed_days: 0,
    last_review: new Date()
  }
}
```

---

### Optimisation des paramètres

FSRS utilise 17 paramètres internes (appelés `w[0]` à `w[16]`) qui sont optimisés par régression sur des millions de données de révision. Ces paramètres déterminent :

- Comment la stabilité évolue selon le rating
- Comment la difficulté influence la rétention
- Les intervalles initiaux pour les nouvelles cartes
- La pénalité pour les oublis

Dans notre implémentation, nous utilisons les paramètres par défaut de la bibliothèque `ts-fsrs`, qui sont déjà optimisés.

---

## Implémentation dans le projet

### Architecture

Notre application utilise FSRS à travers plusieurs couches :

```
┌─────────────────────────────────────┐
│  Interface utilisateur (React)      │
│  app/deck/[id]/review/page.tsx      │
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│  API Routes (Next.js)                │
│  app/api/review/route.ts             │
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│  Logique FSRS                        │
│  lib/fsrs.ts                         │
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│  Bibliothèque ts-fsrs                │
│  node_modules/ts-fsrs                │
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│  Base de données (PostgreSQL)        │
│  Modèle Review (Prisma)              │
└─────────────────────────────────────┘
```

---

### Fichiers clés

#### 1. `lib/fsrs.ts`

Ce fichier contient la logique d'intégration de FSRS dans notre application.

**Fonctions principales** :

- **`createNewCard()`** : Crée une nouvelle carte avec les valeurs FSRS par défaut
  ```typescript
  export function createNewCard(): ReviewData {
    const card = createEmptyCard();
    return {
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      // ... autres propriétés
    };
  }
  ```

- **`reviewCard(reviewData, rating, now?)`** : Calcule les nouvelles valeurs FSRS après une révision
  ```typescript
  export function reviewCard(
    reviewData: ReviewData,
    rating: 'again' | 'hard' | 'good' | 'easy',
    now?: Date
  ): ReviewData {
    // Convertit les données au format ts-fsrs
    const card: Card = { ... };

    // Calcule le nouvel état avec FSRS
    const scheduling = fsrs.repeat(card, now || new Date());
    const recordLog = scheduling[ratingMap[rating]];

    // Retourne les nouvelles données
    return { ... };
  }
  ```

- **`getDueCards(reviews, now?)`** : Filtre les cartes dues à réviser
  ```typescript
  export function getDueCards(reviews: ReviewData[], now?: Date): ReviewData[] {
    const currentTime = now || new Date();
    return reviews.filter(review => review.due <= currentTime);
  }
  ```

---

#### 2. `app/api/review/route.ts`

API Route qui gère les révisions côté serveur.

**GET /api/review** : Récupère les cartes à réviser
```typescript
export async function GET(request: NextRequest) {
  // 1. Vérifier l'authentification
  const user = await getCurrentUser();

  // 2. Récupérer les cartes dues
  const cards = await prisma.card.findMany({
    where: {
      deckId: deckId,
      reviews: {
        some: {
          userId: user.id,
          due: { lte: new Date() }
        }
      }
    },
    include: { reviews: true }
  });

  // 3. Trier par urgence (due date)
  return sortedCards;
}
```

**POST /api/review** : Soumet une révision
```typescript
export async function POST(request: NextRequest) {
  // 1. Récupérer la révision actuelle
  const currentReview = await prisma.review.findUnique(...);

  // 2. Calculer les nouvelles valeurs avec FSRS
  const newReviewData = reviewCard(currentReview, rating);

  // 3. Mettre à jour en base de données
  await prisma.review.update({
    where: { cardId_userId: { cardId, userId } },
    data: newReviewData
  });

  return { success: true };
}
```

---

#### 3. `prisma/schema.prisma`

Schéma de base de données qui stocke les données FSRS.

```prisma
model Review {
  id            String   @id @default(cuid())
  cardId        String
  userId        String

  // Données FSRS
  due           DateTime  // Date de prochaine révision
  stability     Float     // Stabilité de la mémoire
  difficulty    Float     // Difficulté de la carte
  elapsedDays   Int       // Jours depuis dernière révision
  scheduledDays Int       // Jours planifiés jusqu'à prochaine révision
  learningSteps Int       // Étape d'apprentissage actuelle
  reps          Int       // Nombre de répétitions
  lapses        Int       // Nombre d'oublis
  state         Int       // 0: New, 1: Learning, 2: Review, 3: Relearning
  lastReview    DateTime? // Date de dernière révision

  // Métadonnées
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  card          Card     @relation(fields: [cardId], references: [id])
  user          User     @relation(fields: [userId], references: [id])

  // Contraintes
  @@unique([cardId, userId])
  @@index([userId, due])
}
```

**Index optimisé** : `@@index([userId, due])` permet de récupérer rapidement les cartes dues pour un utilisateur.

---

#### 4. `app/deck/[id]/review/page.tsx`

Interface utilisateur pour les révisions.

**Flux de révision** :
```typescript
1. Chargement des cartes dues (fetchCards)
   ↓
2. Affichage de la première carte (recto)
   ↓
3. Utilisateur clique sur "Retourner"
   ↓
4. Affichage recto + verso
   ↓
5. Utilisateur choisit un rating (Encore/Difficile/Bien/Facile)
   ↓
6. Soumission à l'API (handleRating)
   ↓
7. FSRS calcule les nouvelles valeurs
   ↓
8. Mise à jour en base de données
   ↓
9. Passage à la carte suivante ou fin de session
```

---

### Bibliothèque utilisée : ts-fsrs

Nous utilisons la bibliothèque officielle **`ts-fsrs`** (version 5.2.3) qui fournit :

- Implémentation complète de l'algorithme FSRS
- Types TypeScript pour une sécurité de type
- Optimisation des paramètres basée sur des données réelles
- API simple et bien documentée

**Installation** :
```bash
npm install ts-fsrs
```

**Initialisation** :
```typescript
import { FSRS } from 'ts-fsrs';

const fsrs = new FSRS({
  // Paramètres par défaut optimisés
  // Possibilité de personnaliser si besoin
});
```

---

### Flux de données complet

#### Création d'une nouvelle carte

```typescript
1. Utilisateur crée une carte
   ↓
2. API POST /api/cards crée la carte
   ↓
3. createNewCard() génère les valeurs FSRS initiales
   ↓
4. Insertion dans Review table :
   {
     due: Date.now(),
     stability: 0,
     difficulty: 5,
     state: 0, // New
     reps: 0,
     lapses: 0,
     ...
   }
```

#### Révision d'une carte

```typescript
1. GET /api/review?deckId=xxx
   ↓
2. Requête SQL : SELECT * FROM Review WHERE due <= NOW()
   ↓
3. Retourne les cartes triées par urgence
   ↓
4. Interface affiche la première carte
   ↓
5. Utilisateur choisit un rating
   ↓
6. POST /api/review { cardId, rating }
   ↓
7. reviewCard(currentData, rating) calcule nouvelles valeurs
   ↓
8. ts-fsrs.repeat(card, date) applique l'algorithme
   ↓
9. UPDATE Review SET ... WHERE cardId = xxx
   ↓
10. Réponse { success: true }
```

---

### Optimisations implémentées

1. **Index de base de données** : `@@index([userId, due])` pour des requêtes rapides
2. **Requête unique** : Une seule Review par (cardId, userId) grâce à `@@unique`
3. **Tri côté serveur** : Les cartes sont triées par urgence avant envoi au client
4. **Calcul côté serveur** : FSRS s'exécute côté serveur pour éviter la manipulation côté client
5. **Transactions** : Les mises à jour sont atomiques grâce à Prisma

---

## Références

### Documentation officielle

- **FSRS Algorithm** : [https://github.com/open-spaced-repetition/fsrs4anki/wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- **ts-fsrs Library** : [https://github.com/open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- **FSRS Paper** : [A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling](https://www.nature.com/articles/s41539-024-00249-6)

### Articles scientifiques

1. Jarrett Ye, et al. (2024). "A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling". *Nature Scientific Reports*.
2. Piotr Wozniak (1990). "Application of a computer to improve the results obtained in working with the SuperMemo method".
3. Ebbinghaus, H. (1885). "Über das Gedächtnis: Untersuchungen zur experimentellen Psychologie".

### Outils et ressources

- **Anki** : Application de référence utilisant la révision espacée
- **SuperMemo** : Pionnier de la révision espacée
- **FSRS Optimizer** : Outil pour optimiser les paramètres FSRS selon vos données

### Communauté

- **r/Anki** : Communauté Reddit sur la révision espacée
- **FSRS Discord** : Serveur Discord officiel pour discuter de FSRS
- **Open Spaced Repetition** : Organisation GitHub hébergeant FSRS

---

## Glossaire

- **Révision espacée** : Technique d'apprentissage basée sur des révisions à intervalles croissants
- **Rétention** : Probabilité de se souvenir d'une information après un certain temps
- **Stabilité** : Mesure de la solidité d'un souvenir en mémoire à long terme
- **Difficulté** : Mesure de la complexité intrinsèque d'une carte
- **Lapse** : Oubli d'une carte (bouton "Encore")
- **Scheduler** : Algorithme qui détermine quand réviser une carte
- **Due card** : Carte dont la date de révision est passée ou égale à aujourd'hui

---

## Changelog de l'algorithme

### Version actuelle : FSRS v4 (ts-fsrs 5.2.3)

**Améliorations par rapport à SM-2** :
- Précision de prédiction +20%
- Adaptation aux différences individuelles
- Meilleure gestion des oublis
- Optimisation basée sur des données réelles

**Améliorations futures prévues** :
- FSRS v5 : Amélioration de la gestion des cartes difficiles
- Personnalisation automatique des paramètres par utilisateur
- Intégration de l'heure de révision dans le calcul

---

*Documentation créée le 2025-01-15*
*Dernière mise à jour : 2025-01-15*
*Version de l'application : 1.0.0*
*Version FSRS : 4.0 (ts-fsrs 5.2.3)*
