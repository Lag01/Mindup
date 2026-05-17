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
- Import APKG (Anki), XML et CSV avec détection auto du type de contenu
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
- Dashboard à deux thèmes : V1 (header classique, défaut pour tous les utilisateurs) et V3 (sidebar fixe, réservé au compte admin)

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

## Nettoyage des thèmes dashboard (16/05/2026)

### Contexte
Trois interfaces de dashboard coexistaient : V1 (header classique, originale), V2 (HeroStats moderne) et V3 (sidebar latérale, codée mais non intégrée aux APIs). Un modal de choix proposait V1/V2 au premier login et un modal de feedback collectait un avis sur V2 après 3 jours.

### Décisions
- **Thème V2 supprimé** intégralement (page, composants, modal de choix, modal de feedback, route API `dashboard-feedback`).
- **Tous les utilisateurs** sont désormais sur V1 par défaut, sans possibilité de choix.
- **L'admin** dispose d'un sélecteur dans `/admin` (« Thème classique V1 » vs « Thème sidebar V3 ») et démarre par défaut sur V3.

### Modifications techniques
- Schéma Prisma : suppression de `dashboardChoiceDate`, `dashboardFeedbackRating`, `dashboardFeedbackDate`, `dashboardFeedbackGiven` et de l'index associé. `dashboardVersion` est conservé (utilisé uniquement pour la préférence admin V1/V3).
- Migration `20260516120000_remove_dashboard_v2_and_feedback` :
  - `UPDATE User SET dashboardVersion='v1' WHERE (dashboardVersion='v2' OR NULL) AND isAdmin=false`
  - `UPDATE User SET dashboardVersion='v3' WHERE (dashboardVersion='v2' OR NULL) AND isAdmin=true`
  - `DROP COLUMN` sur les 4 colonnes feedback.
- `app/api/user/dashboard-preference` :
  - GET retourne `{ version: 'v1' | 'v3', isAdmin }`. Pour les non-admin, la version effective est forcée à `v1` côté serveur, peu importe la valeur en BD.
  - POST est restreint aux admins (403 sinon), accepte uniquement `v1` ou `v3`.
- `components/DashboardRedirector.tsx` réécrit : appel à l'API préférence, redirection unique vers `/dashboard` ou `/dashboard-v3`. Plus de modals.
- `components/DashboardPageWrapper.tsx` simplifié : redirige si l'utilisateur n'a pas le droit d'être sur la version en cours (non-admin sur V3 → V1 ; admin avec préférence inverse).
- `app/admin/page.tsx` : nouveau bloc « Thème du tableau de bord » avec deux boutons (V1/V3) qui POST vers `/api/user/dashboard-preference`.

### Fichiers supprimés
- `app/dashboard-v2/` (dossier entier)
- `components/DashboardChoiceModal.tsx`
- `components/DashboardFeedbackModal.tsx`
- `app/api/user/dashboard-feedback/route.ts`
- `lib/dashboard-utils.ts` (la fonction `shouldShowFeedbackModal` était l'unique export)

---

## Import natif Anki (.apkg) — 16/05/2026

### Contexte
Pour faciliter la migration depuis Anki, Mindup accepte désormais les exports `.apkg` natifs. Contrairement aux exports texte (`.xml`, `.csv`) qui ne contiennent que le contenu, le format `.apkg` embarque l'historique de révision (intervalles, ease factor SM-2 ou stats FSRS natives, lapses, revlog complet). L'utilisateur peut donc reprendre ses cartes là où il les avait laissées sur Anki.

### Architecture
- **Conteneur** : un `.apkg` est un ZIP contenant `collection.anki21b` (SQLite compressé en Zstandard), `collection.anki2` (SQLite legacy, souvent vide), `media` (JSON mapping zstd) et les fichiers médias numérotés.
- **Pipeline de parsing** (`lib/parsers/apkg.ts`) :
  1. Décompression ZIP via `jszip`
  2. Décompression zstd via `fzstd` (pure JS, compatible serverless)
  3. Lecture SQLite via `sql.js` (WASM, compatible Vercel serverless ; le binaire `sql-wasm.wasm` est explicitement embarqué via `outputFileTracingIncludes` dans `next.config.js`)
  4. Extraction des notes (champs séparés par `\x1f`), cards (avec `ord` pour gérer Basic+Reverse), revlog (compteurs again/hard/good/easy)
  5. Choix du deck principal : celui avec le plus de cartes ; les sous-decks Anki (`Parent\x1fChild`) sont aplatis en `Parent :: Child`
- **Nettoyage HTML** (`lib/parsers.ts` → `cleanAnkiHtml`) : strip des balises `<div>`/`<p>`/`<br>`, décodage des entités (`&nbsp;`, `&amp;`, etc.), suppression des médias (`<img>`, `[sound:...]`), conversion des délimiteurs LaTeX Anki (`[$]...[/$]`, `[latex]...[/latex]`, `\(...\)`) vers `$...$`.
- **Conversion SM-2 → FSRS-5** (`lib/anki-import.ts` → `convertAnkiCardToReviewStats`) :
  - Si `cards.data` contient un état FSRS natif Anki (`{s, d}`), on l'utilise directement
  - Sinon, fallback SM-2 : `stability ≈ ivl` (jours pour les cartes review), `difficulty` extrapolée linéairement depuis `factor` (ease 1.3 → 10, ease 3.5 → 1)
  - Les compteurs `again/hard/good/easy` sont reconstitués depuis le `revlog`
  - Mapping `type` Anki → `CardStatus` Mindup (0→NEW, 1→LEARNING, 2→REVIEW, 3→RELEARNING)

### Interface
- **Option utilisateur** : case à cocher « Préserver mon historique de révision Anki » dans `components/Import/ImportV1.tsx` et `ImportV2.tsx`, visible uniquement quand un fichier `.apkg` est sélectionné. Cochée par défaut.
- **Limite de taille** : 4 Mo pour `.apkg` (les decks avec médias dépassent souvent cette limite et seraient de toute façon limités par Vercel à ~4,5 Mo). XML/CSV restent à 5 Mo.

### Limitations connues (v1)
- **Médias ignorés** : les images et l'audio embarqués dans le `.apkg` sont supprimés (les balises `<img>` et `[sound:...]` sont strippées). Le contenu textuel est préservé. Une v2 pourra uploader les images vers Vercel Blob.
- **Formatage HTML perdu** : gras, italique, listes, couleurs sont effacés. Le contenu est ramené à du texte brut + LaTeX.
- **Notetypes complexes** : Cloze et Image Occlusion fonctionnent partiellement (les champs sont importés mais la logique de masquage Anki n'est pas reproduite — un cloze `{{c1::mot}}` apparaît tel quel).
- **Cartes suspendues/buried** (`queue < 0`) : exclues de l'import.

### Dépendances ajoutées
- `jszip ^3.10.1` (décompression ZIP)
- `fzstd ^0.1.1` (décompression Zstandard, pure JS)
- `sql.js ^1.13.0` + `@types/sql.js` (SQLite via WASM)

---

## Statistiques adaptées au mode de révision (16/05/2026)

### Contexte
Le système de statistiques avait été conçu autour du mode IMMEDIATE (cumuls lifetime `reps`/`*Count`). En mode Anki/FSRS-5, plusieurs métriques étaient inadaptées : `masteredCards` basé sur `easyCount/reps > 0.7` ignore la stabilité mnésique ; `difficultCards` basé sur ratio d'échecs ignore `lapses`/`stability` ; `estimatedCompletionDays` n'a pas de sens (cycles infinis) ; le bloc Anki se limitait à 4 compteurs de statut, sans exploitation des champs FSRS.

### Approche : socle commun + section Anki enrichie
- **Socle commun conservé** : heatmap, streak, distribution des notes, temps d'étude, comparaisons jour/semaine, taux de succès apparent.
- **Adaptations conditionnelles** dans `app/api/decks/[id]/stats/route.ts` :
  - `masteredCards` : IMMEDIATE = `easyCount/reps > 0.7` ; ANKI = `status = 'REVIEW' AND interval >= 21`.
  - `difficultCards` : IMMEDIATE = `(again+hard)/reps > 0.5` ; ANKI = `lapses >= 3 OR (0 < stability < 7)`.
  - La carte « Estimation maîtrise » du `StatsHeroSection` est masquée en mode Anki.
- **4 nouveaux blocs Anki** (rendus uniquement si `learningMethod === 'ANKI'`) :
  - **Forecast 30 jours** (`ForecastChart.tsx`) : bar chart Recharts de la charge journalière `nextReview` + KPI 1j/7j/30j.
  - **True Retention** (`TrueRetentionCard.tsx`) : taux de réussite sur cartes matures (`interval >= 21`) sur 30 jours, gauge SVG colorée (vert ≥90% / bleu ≥85% / orange ≥75% / rouge sinon).
    - *Limitation* : utilise l'`interval` actuel de `Review` comme proxy, faute de champ `intervalAtReview` sur `ReviewEvent`.
  - **Distribution des intervalles** (`IntervalsHistogram.tsx`) : 6 buckets (1j, 2-7j, 8-30j, 31-90j, 91-180j, >180j).
  - **Santé du deck** (`DeckHealthCard.tsx`) : barres horizontales empilées pour la distribution de stabilité (<7/<30/<90/≥90j) et de difficulté (1-3/4-7/8-10).
  - **Cartes fragiles** (`FragileCardsList.tsx`) : top 5 par `stability ASC, lapses DESC` (filtre `lapses >= 3 OR stability < 7`).

### Fichiers modifiés
- `app/api/decks/[id]/stats/route.ts` : requête principale enrichie (définitions IMMEDIATE+ANKI calculées en parallèle), nouveau bloc `if (isAnki)` avec 4 requêtes additionnelles, payload `ankiStats` étendu.
- `components/DeckStatistics/DeckStatisticsV1.tsx` : type `ExtendedDeckStats` étendu, anciens blocs Anki minimaux remplacés par composant interne `AnkiStatsSection` (factorisé desktop+mobile).
- `components/DeckStatistics/v1/StatsHeroSection.tsx` : carte « Estimation maîtrise » masquée si `learningMethod === 'ANKI'`.

### Fichiers créés
- `components/DeckStatistics/v1/anki/ForecastChart.tsx`
- `components/DeckStatistics/v1/anki/TrueRetentionCard.tsx`
- `components/DeckStatistics/v1/anki/IntervalsHistogram.tsx`
- `components/DeckStatistics/v1/anki/DeckHealthCard.tsx`
- `components/DeckStatistics/v1/anki/FragileCardsList.tsx`

### Pistes futures
- Migration pour ajouter `intervalAtReview` à `ReviewEvent` → true retention exacte historique.
- Heatmap de rétention par âge de carte (Card Ease report Anki).
- Adapter `app/api/stats/global/route.ts` (stats multi-decks) sur le même modèle.

---

## Import multi-decks APKG + robustesse CSV + UX post-import (17/05/2026)

### Contexte
Trois améliorations sur les fonctionnalités d'import :
1. Un fichier `.apkg` peut contenir plusieurs decks (et sous-decks `Parent::Enfant` stockés avec `\x1f` dans la table `decks` Anki). Le parser fusionnait silencieusement tout dans un seul deck Mindup, ce qui rendait inutilisable l'import de fichiers Anki multi-decks.
2. Le parser CSV manquait de garde-fous (BOM UTF-8, virgules non-échappées dans des CSV non standards, absence de diagnostic explicite des lignes ignorées).
3. Après un import réussi, l'utilisateur attendait 2 s avant la redirection et devait rafraîchir la page pour voir son nouveau deck — le hook `useFetch` cache les GET pendant 5 min sans mécanisme d'invalidation.

### Architecture multi-decks APKG
- **Refactor `lib/parsers/apkg.ts`** :
  - Nouvelle interface publique `APKGDeckSummary` (`ankiId`, `name`, `cardCount`).
  - `listAPKGDecks(db)` : liste les decks contenant au moins une carte importable (`queue >= 0`), couvre le schéma moderne (table `decks`) et legacy (`col.decks` JSON).
  - `analyzeAPKG(buffer)` : ouvre le `.apkg` et renvoie la liste des decks sans construire les cartes (pour la pré-analyse côté UI).
  - `parseAPKG(buffer, options)` : signature étendue avec `selectedDeckIds`, `mergeMode` (`'split'` | `'merge'`), `mergedDeckName`. Retourne désormais `ParsedDeck[]` (potentiellement de longueur 1).
- **Nouvel endpoint `POST /api/import/analyze`** (`app/api/import/analyze/route.ts`) : retourne `{ format, decks, totalCards, fallbackName }`. Pas de side-effect ; le client garde le `File` et le ré-uploade à l'étape de confirmation.
- **Endpoint `POST /api/import` étendu** : lit `selectedDeckIds` (JSON), `mergeMode`, `mergedDeckName`. Crée N decks dans une transaction en mode `split`. Vérifie la limite `maxDecksPerUser` cumulée (`userDecksCount + parsedDecks.length`) avant insertion. Réponse rétro-compatible : champs `deck` (premier deck) et `decks` (tous).

### UI de sélection
- **`components/Import/DeckSelectionModal.tsx`** (nouveau) : modale affichée quand l'`.apkg` contient ≥2 decks. Checkboxes par deck avec compteur de cartes, raccourcis « Tout sélectionner / Aucun », boutons radio split/merge, champ texte pour le nom du deck fusionné (pré-rempli avec le nom du fichier).
- **`ImportV1` et `ImportV2`** : flow analyze → modale (si multi-deck) → import. Le cas mono-deck (CSV, XML, ou APKG avec un seul deck) reste transparent : aucun écran intermédiaire.

### Robustesse CSV (`lib/parsers.ts`)
- Strip du BOM UTF-8 en tête de fichier.
- `delimiter: ','` explicite pour neutraliser l'auto-détection sur des champs ambigus (dates `1914-1918`, etc.).
- Tolérance aux virgules non-échappées : si `row.__parsed_extra` est non vide et le CSV n'a que 2 colonnes, les champs en trop sont recollés au `back`. Limité aux CSV à 2 colonnes pour ne pas masquer d'erreurs sur des formats >2 colonnes.
- Messages d'erreur enrichis : nombre de lignes ignorées et colonnes détectées.

### UX post-import
- **`hooks/useFetch.ts`** : export d'une fonction `invalidateFetchCache(url?)` qui purge le `Map` de cache global (par URL ou en totalité).
- **ImportV1/V2** : sur succès, `invalidateFetchCache('/api/decks')` + `invalidateFetchCache()` (purge globale), puis `router.push('/dashboard-entry')` après 300 ms (au lieu de 2 s) suivi d'un `router.refresh()`.

### Fichiers créés
- `app/api/import/analyze/route.ts`
- `components/Import/DeckSelectionModal.tsx`

### Fichiers modifiés
- `lib/parsers/apkg.ts` (refactor majeur : multi-deck, analyze)
- `lib/parsers.ts` (CSV : BOM, délimiteur, tolérance, diagnostic)
- `app/api/import/route.ts` (paramètres de sélection, transaction multi-deck)
- `hooks/useFetch.ts` (export `invalidateFetchCache`)
- `components/Import/ImportV1.tsx`, `ImportV2.tsx` (flow analyze + cache invalidation)

### Limitations connues
- L'utilisateur ré-uploade le fichier entre `analyze` et `import` (pas de cache serveur entre les deux appels) ; sur de gros `.apkg` proches de 4 Mo, cela double le temps de transfert mais reste acceptable.
- Le tri des decks affichés dans la modale suit l'ordre décroissant du nombre de cartes (déjà appliqué par `listAPKGDecks`).

---

**Dernière mise à jour** : 17/05/2026
