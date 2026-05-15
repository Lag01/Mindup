# Rapport du Projet - Mindup (Flashcards App)

## Description

Application web de révision par flashcards avec système de révision immédiate et algorithme ANKI. Déployée sur Vercel avec base de données Neon PostgreSQL.

## Stack Technique

| Composant | Technologie | Version |
|-----------|------------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| Frontend | React | 19.2.1 |
| Langage | TypeScript | 5.9.3 |
| CSS | Tailwind CSS | 4.1.17 |
| ORM | Prisma | 6.19.0 |
| Base de données | PostgreSQL (Neon) | - |
| Auth | bcrypt + JWT (jose) | 6.0.0 / 6.1.3 |
| Stockage images | Vercel Blob | 2.0.0 |
| LaTeX | KaTeX | 0.16.25 |
| Graphiques | Recharts | 3.4.1 |
| Animations | Lottie React | 2.4.1 |
| Algorithme SR | ts-fsrs | 5.2.3 |
| State | Zustand | 5.0.9 |

## Fonctionnalités

### Authentification et sécurité
- Inscription/connexion par email + mot de passe (bcrypt, 10 salt rounds)
- Sessions JWT (2h) avec cookies httpOnly, secure, sameSite=strict
- Refresh tokens (7j) avec rotation et hachage SHA256
- Rate limiting par IP (login: 3/30min, signup: 2/1h)
- CSP, HSTS, X-Frame-Options DENY, Permissions-Policy
- Validation magic bytes pour les uploads d'images
- Audit logging (AuditLog model)

### Gestion des decks et cartes
- CRUD complet des decks et cartes
- Support texte et LaTeX (avec validation des commandes dangereuses)
- Images recto/verso (upload admin, compression Sharp, Vercel Blob)
- Import XML/CSV avec détection auto du type de contenu
- Export XML/CSV
- Permutation recto/verso en masse
- Modification des types de contenu en masse

### Systèmes de révision
- **Mode immédiat** : file dynamique avec réinsertion selon la difficulté
- **Mode ANKI** : algorithme de répétition espacée (interval, ease factor, statuts NEW/LEARNING/REVIEW)
- Statistiques détaillées par deck et par session

### Decks publics
- Publication/dépublication (admin)
- Marketplace de decks communautaires
- Import/synchronisation automatique
- Compteur d'imports

### Jeux et compétition
- VeryFastMath (4 modes de calcul mental, chronomètre 1 min)
- Leaderboards globaux (révisions et streaks)
- Leaderboard VeryFastMath

### Administration
- Gestion des utilisateurs (liste, suppression, display name)
- Configuration globale (max decks, max utilisateurs)
- Publication de decks publics
- Cleanup base de données

### Infrastructure
- Cron job quotidien : nettoyage des images orphelines (Vercel Cron, 2h UTC)
- Service Worker PWA
- Dashboard multi-versions (V1, V2, V3)

## Sécurité - Audit du 25/03/2026

### Posture globale : 8.5/10

### Corrections appliquées
1. **npm audit fix** : 8/9 vulnérabilités corrigées
   - fast-xml-parser : 5.3.1 -> 5.5.9 (6 CVEs critiques corrigées)
   - undici, flatted, minimatch, ajv : mises à jour de sécurité
   - Next.js : 16.0.10 -> 16.2.1
2. **Parser XML durci** : `processEntities: false` + limite 5 Mo (défense en profondeur)
3. **CSP renforcée** : `unsafe-eval` retiré de `script-src`

### Vulnérabilité résiduelle
- `effect` (dépendance interne de Prisma >= 6.13) : AsyncLocalStorage sous charge concurrente avec RPC. Non applicable à cette app (pas d'utilisation directe d'Effect).

### Points vérifiés et sécurisés
- Prisma `$queryRaw` : tagged template literals (paramétrisé automatiquement)
- Secrets `.env.local` : dans `.gitignore`, non traqué par git
- Cookies : httpOnly, secure, sameSite=strict
- Uploads : validation magic bytes + MIME + taille + admin-only
- Headers : HSTS, X-Frame-Options DENY, nosniff, Permissions-Policy
- Timing attacks : `crypto.timingSafeEqual` pour la comparaison de tokens
- LaTeX : commandes dangereuses bloquées (\input, \write, etc.)

## Audit qualité - 23/04/2026

### Corrections appliquées

**Sécurité**
- Timing attack au login : dummy hash bcrypt si email inexistant (prévient l'énumération d'emails)
- Validation LaTeX étendue : 8 nouvelles commandes bloquées (`\documentclass`, `\usepackage`, `\newcommand`, `\def`, `\let`, `\catcode`, `\jobname`, `\output`)

**Types TypeScript**
- `Card.review?: any` → `Card.review?: Review` dans `lib/types.ts`
- `deck: any` → `DeckWithStats` dans `lib/store/decks.ts`
- `Leaderboard V1/V2` : unions discriminées (`FlashcardsLeaderboardEntry | MathLeaderboardEntry | StreakLeaderboardEntry`) remplacent tous les `any`

**UX & Accessibilité**
- `alert()` / silent fail → toasts (`useToast`) pour reset stats, export et suppression dans dashboard-v3
- Zones cliquables augmentées à `min-w-[44px] min-h-[44px]` (conformité WCAG) dans `EnhancedDeckCard` et `UserProfile`
- Alt d'images : descriptions contextuelles dans `CardContentDisplay` (prop `imageAlt` + fallback basé sur le texte)

**Performance & Stabilité**
- Race condition corrigée dans dashboard-v3 : flag `mounted` + cleanup dans `useEffect`
- Cache `useFetch` : limite de taille à 100 entrées (prévient les fuites mémoire)
- Cache TTL externalisé dans `lib/constants.ts`

**Base de données**
- Index `@@index([userId, lastReview])` ajouté sur `Review` (requêtes de statistiques par date)
- Migration à appliquer : `npx prisma migrate dev`

**Organisation du code**
- `lib/constants.ts` créé : magic numbers centralisés (CACHE_TTL_MS, CACHE_MAX_SIZE, IMAGE_MAX_SIZE_MB, CARD_MAX_CONTENT_LENGTH, API_ROUTES, LEADERBOARD_PAGE_SIZE)
- `.env.example` consolidé avec toutes les variables requises

## Bugfixes - 08/05/2026

### Trois bugs corrigés sur les données

**Mode Immédiate : cartes manquantes en révision**
- Symptôme : sur un deck de 6 cartes, seules 4 apparaissaient en révision après ajout des 2 dernières.
- Cause : `ReviewV2.tsx` restaurait le `baseDeck` depuis `localStorage` et se contentait de filtrer les cartes supprimées, sans réinjecter celles ajoutées au deck après le démarrage de la session.
- Correction : `components/Review/ReviewV2.tsx` — après synchronisation, ajout en queue (mélangé) des cartes présentes dans `data.cards` mais absentes du `baseDeck` sauvegardé. Fallback "démarrage frais" si la session restaurée est vide.

**Statistiques temporelles : courbe et fenêtres glissantes faussées**
- Symptôme : la courbe de révision affichait au plus 1 point par carte par jour (au lieu du nombre réel de réponses), et les indicateurs "cette semaine / aujourd'hui" mélangeaient les cumuls historiques avec la fenêtre courante.
- Cause : `Review.lastReview` est un timestamp écrasé à chaque révision et `Review.*Count` sont des cumuls all-time. Une carte révisée 50 fois aujourd'hui n'apparaissait qu'une fois dans la courbe, et `successRateThisWeek` attribuait à la semaine en cours toutes les anciennes révisions des cartes dont la dernière review tombait dans la fenêtre.
- Correction : refonte des requêtes temporelles sur `ReviewEvent` (table granulaire `userId, cardId, rating, createdAt`).
  - `app/api/decks/[id]/stats/route.ts` : `reviewHistory`, `reviewsToday`, `reviewsThisWeek`, `reviewsYesterday`, `reviewsPreviousWeek`, `successRateThisWeek`, `successRatePreviousWeek` migrés vers `ReviewEvent`.
  - `app/api/stats/global/route.ts` : `reviewsToday` migré vers `ReviewEvent`.

**Service Worker : déploiements masqués par un cache trop agressif**
- Symptôme : après un déploiement, les utilisateurs continuaient à voir l'ancien comportement de l'app même après rafraîchissement avec vidage du cache. Erreurs `Manifest: Syntax error` en console.
- Cause : `public/sw.js` mettait en cache toutes les requêtes GET sans distinction (HTML de navigation, routes API, bundles Next.js).
- Correction : refonte du SW avec stratégie différenciée — `/api/*` et `/_next/*` non touchés, navigations en network-first avec fallback offline, cache-first uniquement sur les assets précachés. `CACHE_NAME` bumpé à `mindup-v2` pour invalider l'ancien cache.

**Reset deck : suppression de l'historique global du leaderboard et de l'admin**
- Symptôme : réinitialiser les stats d'un deck faisait disparaître les révisions correspondantes du leaderboard et du dashboard admin.
- Cause : `prisma.review.deleteMany` cascade-deletait les `ReviewEvent` associés (`Review.events` en `onDelete: Cascade` dans `prisma/schema.prisma:160`). Or le leaderboard (`api/leaderboard/route.ts`) et l'admin (`app/admin/page.tsx` via `_count.reviewEvents`) lisent précisément `ReviewEvent`.
- Correction : `app/api/decks/[id]/reset-stats/route.ts` — passage à `prisma.review.updateMany` qui remet à zéro les compteurs (`reps`, `*Count`, `lastReview`, `interval`, `nextReview`, `easeFactor`, `status`) sans supprimer les lignes `Review`. `ReviewEvent` est ainsi préservé.

---

## Migration FSRS-5 (16/05/2026)

### Objectif
Offrir deux algorithmes de révision aux utilisateurs :
- **Mode IMMEDIATE** (« rapide ») — file cyclique, cartes qui reviennent rapidement dans la session selon la note. Apprentissage rapide d'une notion, sans rétention long terme garantie.
- **Mode ANKI** (« béton ») — algorithme **FSRS-5** (Free Spaced Repetition Scheduler, version 5) via la lib `ts-fsrs ^5.2.3`. Calendrier optimisé pour la mémorisation à long terme.

### Architecture FSRS-5
- `lib/anki.ts` instancie un scheduler FSRS-5 avec `enable_fuzz: true` (rétention cible figée à 0.9, poids `w` par défaut).
- Chaque révision met à jour : `stability` (jours), `difficulty` (1-10), `lapses`, `status` (`NEW` / `LEARNING` / `REVIEW` / `RELEARNING`), `interval`, `nextReview`.
- `lib/fsrs.ts` (ancien code mort SM-2) a été supprimé.
- `easeFactor` est conservé dans le schéma pour compatibilité mais n'est plus utilisé par FSRS.

### Limites quotidiennes par deck
- `newCardsPerDay` (défaut **20**) — nombre de cartes neuves servies par jour.
- `maxReviewsPerDay` (défaut **200**) — plafond total de révisions par jour.
- **Comportement Anki-like** : les nouvelles cartes consomment aussi le budget `maxReviewsPerDay` (même `ReviewEvent`). Si `maxReviewsPerDay = 200` et que l'utilisateur étudie 20 nouvelles cartes, il reste `200 - 20 = 180` révisions disponibles pour les cartes en `LEARNING/REVIEW/RELEARNING`.
- Réglables sans réinitialisation des stats via `DeckSettingsV1/V2`.

### File de révision (`GET /api/review?deckId=...`)
1. Priorité aux cartes dues (`status IN (LEARNING, REVIEW, RELEARNING)` et `nextReview <= NOW()`), triées par `nextReview ASC`, limitées au `reviewBudget` restant.
2. Puis cartes neuves (`status = 'NEW'` ou pas de `Review`), triées par `order`, limitées au `newBudget` restant.
3. Override `customStudy=true` : ignore les quotas (bouton **Réviser plus** en fin de session).

### Stats deck enrichies
- `ankiStats.relearning` : cartes en ré-apprentissage (oubliées).
- `ankiStats.avgStability` : stabilité moyenne (jours) sur les cartes ayant `stability > 0`.
- `ankiStats.dueToday` filtre désormais sur `nextReview <= NOW()` (horaire précis, pas `CURRENT_DATE`).

### Bugs corrigés en même temps
- **Migration Prisma manquante** : ajout de `prisma/migrations/20260516000000_add_fsrs5_fields/migration.sql` (les colonnes `stability/difficulty/lapses`, l'enum value `RELEARNING` et les colonnes `newCardsPerDay/maxReviewsPerDay` étaient dans `schema.prisma` mais sans migration SQL).
- **Reset stats** : `app/api/decks/[id]/reset-stats/route.ts` remet maintenant à zéro `stability`, `difficulty`, `lapses` en plus des compteurs (sinon FSRS produit des intervalles aberrants après reset).
- **Cartes legacy SM-2** : `lib/anki.ts` détecte les cartes héritées (status `LEARNING/REVIEW` mais `stability = 0`) et démarre proprement le scheduler FSRS via `createEmptyCard()` au premier passage, tout en préservant les compteurs historiques (`reps`, `*Count`, `lapses`). Évite les `retrievability = NaN` qui auraient corrompu les decks ANKI existants au premier rating.
- **Régression V1** : `ReviewV1.tsx` aligné sur V2 — les cartes ajoutées au deck après le démarrage d'une session IMMEDIATE sont désormais réinjectées dans le `baseDeck` au reload.
- **Types** : `AnkiStats` étendu (`relearning`, `avgStability`), `Review` étendu (`status`, champs FSRS), `(c.review as any).status` nettoyé.

### Comportement de transition pour les decks ANKI existants
Les decks créés avant la migration FSRS-5 contiennent des cartes calibrées en SM-2 (`interval`, `easeFactor` cohérents, `stability = 0`). Au **premier rating** sous FSRS-5 :
- Le scheduler est ré-initialisé via `createEmptyCard` (donc l'intervalle suivant sera calibré « première révision FSRS » : ~1 jour pour `good`, pas l'ancien intervalle SM-2 de 30 jours par ex.).
- Les compteurs `reps`, `againCount`, `hardCount`, `goodCount`, `easyCount`, `lapses` sont **préservés et incrémentés** comme avant.
- À partir du second rating, la carte suit le calendrier FSRS-5 normal.

Concrètement : les utilisateurs verront des intervalles temporairement plus courts pendant 1–2 révisions sur les cartes déjà avancées en SM-2, puis FSRS prend le relais.

### Pistes futures
- Rendre la rétention FSRS (`request_retention`) configurable par deck (slider 80-97%). Actuellement figée à 0.9.
- Supprimer définitivement la colonne legacy `easeFactor` après une période de transition.

---

**Dernière mise à jour** : 16/05/2026
