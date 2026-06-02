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

## Audit transverse — Ratissage complet du projet (18/05/2026)

### Contexte
Ratissage exhaustif des 7 zones fonctionnelles du projet (auth/sécurité, decks/cartes/review API, import/export, UI révision/édition, dashboard/stats UI, public decks/leaderboard/VeryFastMath, admin/cron/upload). Exécution par 7 agents d'exploration en parallèle, consolidation et vérification manuelle, puis application des corrections évidentes.

Le tableau de bord persistant inter-session est `AUDIT.md` (racine du projet). Avant de relancer un ratissage similaire, consulter sa section *Couverture* pour ne pas refaire le travail.

### Bilan
- **116 findings** remontés au total, **17 corrections appliquées**, **~30 faux positifs**, **~60 sujets différés** en attente de validation produit ou refactor structurel.

### Corrections appliquées
**Sécurité / bugs S1**
- `delete-card-image` route : `export DELETE` → `export POST` (les 6 clients appelaient en POST, suppression d'images cassée silencieusement).
- Validation LaTeX (`validateCardContent`) appliquée à toutes les cartes importées via CSV/XML/APKG (3 chemins). Auparavant, du LaTeX dangereux pouvait être importé sans contrôle.

**Bugs fonctionnels S2**
- `app/api/decks/[id]/settings/route.ts` : changement de méthode IMMEDIATE↔ANKI passe à `updateMany` (préserve `ReviewEvent` pour le leaderboard, même fix que `reset-stats` du 08/05).
- `app/api/auth/signup/route.ts` : catch P2002 Prisma pour message propre en cas de signups concurrents.
- `app/api/veryfastmath/leaderboard/route.ts` : tie-breaker par `createdAt` (stabilité d'ordre).
- `lib/sync-decks.ts` : N+1 sur ajout de cartes → `createMany` batch.
- `components/DeckStatistics/v1/anki/TrueRetentionCard.tsx` : affichage neutre (`—` + label `N/A`) si aucune carte mature, au lieu d'un score trompeur de 0% noté « Faible ».
- `app/api/import/route.ts` : messages d'erreur de parsing masqués au client (logs serveur uniquement).

**S3 / qualité**
- Validation regex email + limite 254 chars (`signup`, `login`).
- `app/api/decks/[id]/export/route.ts` : `findUnique` → `findFirst` avec ownership.
- `app/api/decks/[id]/swap-all/route.ts` : N requêtes → 1 `$executeRaw UPDATE` atomique (~100× plus rapide).
- `app/api/veryfastmath/save-score/route.ts` : rate-limit 10/min/user via `lib/rate-limiter.ts`.
- `app/api/admin/users/[id]/display-name/route.ts` : regex unicode bloque caractères de contrôle, RTL marks, ZWJ.
- `components/DeckStatistics/v1/anki/DeckHealthCard.tsx` : segments non-vides garantis visibles (`minWidth: 6px`).
- Types `any` → types Prisma stricts dans `sync-decks.ts` (`ContentType`) et `bulk-update-types/route.ts` (`Prisma.CardUpdateManyMutationInput`).

**S4 / micro-corrections**
- `AddCardsV1/V2.tsx` : `disabled={saving}` + label « Ajout en cours… » sur le bouton "Ajouter et continuer".

### Sujets différés (synthèse)
- **Timezone transverse** (statsdeck, streak, trendchart) — décision globale à prendre.
- **Refresh token httpOnly** — refonte mineure de la lib auth.
- **Anti-triche VFM** — token de session côté serveur.
- **Pagination DB** sur leaderboards et liste admin users.
- **`alert()`/`confirm()` → toasts** — ~18 sites à remplacer.
- **A11y modales** : escape/click-outside/focus restore (pattern réutilisable).
- **Suppression du champ legacy `easeFactor`** après période de transition.

Tous les détails (avec sévérités, fichiers, statuts) sont dans `AUDIT.md`.

### Fichiers modifiés (corrections)
- `app/api/auth/{signup,login}/route.ts`
- `app/api/import/route.ts`
- `app/api/upload/delete-card-image/route.ts`
- `app/api/decks/[id]/{settings,export,swap-all,bulk-update-types}/route.ts`
- `app/api/veryfastmath/{leaderboard,save-score}/route.ts`
- `app/api/admin/users/[id]/display-name/route.ts`
- `lib/sync-decks.ts`
- `components/AddCards/{AddCardsV1,AddCardsV2}.tsx`
- `components/DeckStatistics/v1/anki/{TrueRetentionCard,DeckHealthCard}.tsx`

### Fichiers documentaires créés/mis à jour
- `AUDIT.md` (nouveau) — tableau de bord persistant inter-session.
- `log_erreurs.md` — entrées formelles pour les bugs non triviaux corrigés.
- `Projet.md` — cette section.

---

## Mise à jour 21/05/2026 — VeryFastMath unifié + correctifs Anki

### VeryFastMath : suppression du résidu Theme 2
- L'écran de sélection des modes affichait un style "V2" (gradients/glows hérités du theme 2 supprimé) lorsque l'utilisateur était en theme 3, mais un style sobre "V1" en theme 1.
- `app/veryfastmath/page.tsx` : retrait de la branche `isV1 ? V1 : V2` et de `useDashboardVersion`. Les deux thèmes utilisent désormais le même menu.
- Suppression de `app/veryfastmath/components/ModeSelectionScreen.tsx` et `ResultsScreen.tsx` (versions V2 obsolètes), puis renommage des V1 vers ces noms standards.
- `hooks/useDashboardVersion.ts` : fallback d'erreur `'v2'` → `'v1'` (l'API ne supporte plus `v2`).

### Système Anki : correctifs bugs Z2-04 / Z2-05 et améliorations UX
- **Z2-05 corrigé** : la détection "première révision aujourd'hui" repose maintenant sur `MIN(ReviewEvent.createdAt) >= todayStart` au lieu de `Review.createdAt`. Les cartes créées ou importées sans révision ne consomment plus à tort le budget `newCardsPerDay`.
- **Z2-04 corrigé** : le client transmet `X-Timezone` (`Intl.DateTimeFormat`), et le serveur calcule `todayStart` dans le fuseau local de l'utilisateur via le nouveau `lib/dates.ts::computeLocalDayStart`. Plus de décalage 1-2h pour les utilisateurs en France.
- **API enrichie** : `GET /api/review` renvoie maintenant `meta.doneToday` (compteurs et limites journalières) et `meta.nextDueAt` (prochaine carte due).
- **UI Anki** (`components/Review/ReviewV1.tsx`) :
  - Badge "🆕 Nouvelle carte" ou "🔄 Révision" sur la carte courante.
  - Compteurs distincts visibles : "X nouvelles restantes · Y révisions restantes".
  - Ligne de progression journalière : "Aujourd'hui : N/limit nouvelles · M/limit révisions".
  - Écran "Tout révisé" enrichi : distingue "limite atteinte" vs "aucune carte due", affiche la prochaine carte due au format date locale.

### Fichiers modifiés
- `app/veryfastmath/page.tsx`
- `app/veryfastmath/components/ModeSelectionScreen.tsx` (renommé depuis V1)
- `app/veryfastmath/components/ResultsScreen.tsx` (renommé depuis V1)
- `hooks/useDashboardVersion.ts`
- `app/api/review/route.ts`
- `components/Review/ReviewV1.tsx`
- `lib/dates.ts` (nouveau)
- `AUDIT.md` (Z2-04 et Z2-05 marqués 🟢)

---

## Refonte des statistiques Anki et fiabilisation des compteurs (23/05/2026)

### Contexte
Les indicateurs Anki donnaient des chiffres peu crédibles : compteur « à réviser » gonflé par toutes les cartes neuves, estimation de maîtrise absurde (« ~480 semaines »), et stats peu pertinentes sur la charge de travail. Objectif : se rapprocher du rapport officiel Anki (Future Due, catégories de cartes, rétention réelle).

### Modifications
- **Compteur « à réviser » réaliste** (accueil) : aligné sur la file de révision réelle via le helper partagé `computeRealisticDue()` (`lib/anki.ts`). Dues et nouvelles cartes sont chacune plafonnées par le budget quotidien restant. Fuseau transmis via header `X-Timezone` (`lib/store/decks.ts` → `app/api/decks/route.ts`).
- **Estimation de maîtrise corrigée** : vélocité de maturation normalisée par les jours réellement étudiés, bornée, avec état « Données insuffisantes » (`app/api/decks/[id]/stats/route.ts`, `formatCompletionDays` v1/v2).
- **Charge de travail « Future Due »** : prévision 365 jours segmentée par statut (apprentissage / récentes / matures), graphe empilé + courbe cumulative + sélecteur de période (1 mois / 3 mois / 1 an) + KPIs (aujourd'hui, demain, 7 j, charge journalière). Nouveau composant partagé `components/DeckStatistics/shared/WorkloadChart.tsx`, intégré en v1 ET v2.
- **Catégories de cartes Anki** : carte « Nombre de cartes » (Nouvelles / En apprentissage / Réapprentissage / Jeunes / Matures) — `shared/CardCountsCard.tsx`, couleurs issues de `lib/cardCategories.ts`.
- **Rétention réelle par période** : tableau Aujourd'hui / Hier / Semaine / Mois / Année × Récentes / Matures / Tout — `shared/TrueRetentionTable.tsx`.
- **Traduction** : labels de la barre de progression de l'accueil passés en français (`EnhancedDeckCard.tsx`).

### Fichiers modifiés / créés
- `lib/anki.ts` (helper `computeRealisticDue`, constante `MATURE_INTERVAL_DAYS`)
- `app/api/decks/route.ts`, `lib/store/decks.ts`
- `app/api/decks/[id]/stats/route.ts` (vélocité, forecast 365 j, rétention périodisée, young/mature)
- `components/DeckStatistics/shared/WorkloadChart.tsx`, `TrueRetentionTable.tsx`, `CardCountsCard.tsx` (nouveaux)
- `components/DeckStatistics.tsx` (v2), `components/DeckStatistics/DeckStatisticsV1.tsx`
- `components/DeckStatistics/v1/StatsHeroSection.tsx`, `v2/StatsHeroSection.tsx`
- `app/dashboard-v3/components/MainContent/EnhancedDeckCard.tsx`
- `log_erreurs.md` (entrée 23/05/2026)

---

## Objectif quotidien unique « N cartes/jour » (26/05/2026)

### Contexte
Le compteur « à réviser » reposait sur deux budgets quotidiens indépendants (`newCardsPerDay` pour les nouvelles, `maxReviewsPerDay` pour les révisions). Après une session, le budget de nouvelles restant continuait d'alimenter le compteur (ex. « 19 à réviser » après 27 révisions), ce qui ne correspondait pas au modèle mental de l'utilisateur.

### Modifications
- **Objectif quotidien unique** : nouveau champ par deck `cardsPerDay` (défaut 20, toutes catégories confondues). On vise `cardsPerDay` cartes distinctes par jour, **priorité aux cartes dues déjà vues**, puis complétées par des nouvelles cartes.
- **`computeRealisticDue` réécrit** (`lib/anki.ts`) : `budget = cardsPerDay - cardsSeenToday` ; compteur = `min(budget, dues + nouvelles)`.
- **File de révision** (`app/api/review/route.ts`) : sélection des dues en priorité (LIMIT budget), complétée par des nouvelles (LIMIT budget restant). `meta.doneToday` simplifié en `{ cardsSeen, cardsLimit }`.
- **Dashboard** (`app/api/decks/route.ts`) : suppression de la requête « nouvelles vues aujourd'hui » devenue inutile.
- **UI réglages** (`DeckSettingsV1/V2`) : un seul champ « Cartes / jour » à la place des deux limites. Affichage session « X / N cartes aujourd'hui » (`ReviewV1`).
- **Schéma** : migration additive `20260526000000_add_cards_per_day` (⚠️ à appliquer en prod). `newCardsPerDay`/`maxReviewsPerDay` conservés mais non utilisés par la logique.

### Fichiers modifiés
- `prisma/schema.prisma`, `prisma/migrations/20260526000000_add_cards_per_day/migration.sql`
- `lib/anki.ts`, `lib/types.ts`
- `app/api/decks/route.ts`, `app/api/review/route.ts`, `app/api/decks/[id]/settings/route.ts`
- `components/DeckSettings/DeckSettingsV1.tsx`, `DeckSettingsV2.tsx`, `components/Review/ReviewV1.tsx`
- `log_erreurs.md` (entrée 26/05/2026)

---

## Catégorisation Anki unifiée + couleurs cohérentes (26/05/2026)

### Contexte
La notion de « carte maîtrisée » était définie différemment selon l'écran : le dashboard comptait toutes les cartes en révision (`status='REVIEW'`), la page de stats uniquement les matures (`interval >= 21`). D'où des chiffres contradictoires (ex. « 40 maîtrisées » au dashboard vs « 4/113 » dans les stats). En parallèle, la catégorie « Réapprentissage » n'était affichée nulle part et chaque écran utilisait sa propre palette de couleurs.

### Modifications
- **5 catégories façon Anki**, dérivées du champ FSRS `status` + intervalle (seuil `MATURE_INTERVAL_DAYS = 21`) :
  - Nouvelles (`NEW`), En apprentissage (`LEARNING`), Réapprentissage (`RELEARNING`), Jeunes (`REVIEW` + `interval < 21`), Matures (`REVIEW` + `interval >= 21`).
  - **« Maîtrisé » = Matures** uniquement (définition Anki), désormais identique entre dashboard et stats.
- **Source unique de vérité** : nouveau `lib/cardCategories.ts` (labels + couleurs + helper `toDashboardGroups`). Palette unifiée : Nouvelles `#3b82f6`, Apprentissage `#f59e0b`, Réapprentissage `#ef4444`, Jeunes `#84cc16`, Matures `#22c55e`.
- **API dashboard** (`app/api/decks/route.ts`) : split des cartes `REVIEW` en young/mature, exposés dans `ankiStats`.
- **Dashboard v3** (`EnhancedDeckCard`) : barre compacte 3 groupes (Nouvelles · En cours · Maîtrisées). **Dashboard v1** : libellés et couleurs alignés.
- **Page de stats** (`CardCountsCard`) : 5 catégories affichées (ajout de Réapprentissage). `WorkloadChart` aligné sur la palette.

### Fichiers modifiés
- `lib/cardCategories.ts` (nouveau), `lib/types.ts`
- `app/api/decks/route.ts`
- `app/dashboard-v3/components/MainContent/EnhancedDeckCard.tsx`, `app/dashboard/page.tsx`
- `components/DeckStatistics/shared/CardCountsCard.tsx`, `WorkloadChart.tsx`
- `components/DeckStatistics.tsx`, `components/DeckStatistics/DeckStatisticsV1.tsx`
- `log_erreurs.md` (entrée 26/05/2026)

Aucune migration Prisma (catégorisation purement calculée, aucun nouveau champ persisté).

---

## Lisibilité des verts + consolidation de la palette stats (27/05/2026)

### Contexte
Deux verts de catégorie trop proches visuellement (Jeunes `#84cc16` lime / Matures `#22c55e` green-500), souvent affichés côte à côte (barre `CardCountsCard`, barres empilées `WorkloadChart`) → distinction difficile. En parallèle, la page de stats redéfinissait des palettes ad hoc dans plusieurs composants, avec des quasi-doublons pour un même rôle (deux verts « succès » `#22c55e`/`#10b981`, deux bleus `#3b82f6`/`#2563eb`, deux violets `#a855f7`/`#a78bfa`).

### Modifications
- **Verts recolorés** (`lib/cardCategories.ts`) avec fort contraste de luminosité : **Jeunes `#4ade80`** (green-400, clair) et **Matures `#166534`** (green-800, foncé). Se propage automatiquement à tout consommateur de `CARD_CATEGORIES` / `CARD_CATEGORY_COLORS` (dashboard, stats).
- **Palette sémantique partagée** : nouveau `CHART_COLORS` dans `lib/cardCategories.ts` (un token par rôle : `danger`, `warning`, `caution`, `info`, `success`, `accent`, `cyan`) pour supprimer les doublons.
- **Composants stats rattachés à `CHART_COLORS`** : `DeckHealthCard`, `IntervalsHistogram`, `DistributionTabs` (v1 + v2), `TrendChart` (`#2563eb→info`), `WorkloadChart` (cumul `#a78bfa→accent`), `TrueRetentionCard`. `#10b981` (emerald) remplacé par `success` (`#22c55e`) partout.

### Fichiers modifiés
- `lib/cardCategories.ts` (verts + `CHART_COLORS`)
- `components/DeckStatistics/v1/anki/DeckHealthCard.tsx`, `IntervalsHistogram.tsx`, `TrueRetentionCard.tsx`
- `components/DeckStatistics/v1/DistributionTabs.tsx`, `components/DeckStatistics/v2/DistributionTabs.tsx`
- `components/DeckStatistics/v1/TrendChart.tsx`, `components/DeckStatistics/shared/WorkloadChart.tsx`

`ProgressRing` (v2) laissé tel quel : ses `#10b981`/`#2563eb` sont des bornes de dégradés deux-tons, pas des doublons de rôle. Aucune migration Prisma.

---

## Fix session ANKI inter-journée : popup prématurée après 1 carte (31/05/2026)

### Contexte
Une session ANKI sauvegardée dans `localStorage` la veille (queue réduite à ~1 carte) était restaurée le lendemain, puis filtrée par `id` contre les cartes fraîches de l'API. Les nouvelles cartes dues du jour, absentes de la queue d'hier, étaient écartées → la session tombait à 1 carte, déclenchant la popup « Toutes les cartes sont révisées » après une seule notation alors que le dashboard annonçait 20 cartes.

### Modifications
- `components/Review/ReviewV2.tsx` : ajout d'un horodatage `savedAt` à chaque sauvegarde de session ; `loadSessionState` rejette toute session **ANKI** dont `savedAt` n'est pas le jour courant **ou est absent** (session héritée d'avant le fix) → repart sur les cartes fraîches de l'API. Restauration intra-journée préservée.
- `lib/types.ts` : champ `savedAt?: string` ajouté à `SessionState`.

Aucune migration Prisma (état purement côté client). Détail complet dans `log_erreurs.md`.

---

## Analyse de performance : diagnostic des chargements 1–5 s (31/05/2026)

### Contexte
Investigation des temps de chargement de 1 à 5 secondes sur les pages principales (dashboard, decks, révision). Rapport de diagnostic complet (sans modification de code) produit dans **`ANALYSE_PERFORMANCE.md`**.

### Conclusions principales
- **Le SQL n'est pas en cause** : base ≈ 38 Mo, aucune requête applicative lente dans `pg_stat_statements` (inspection MCP du projet Neon `raspy-dawn-60994491`, région Francfort).
- Causes réelles, par impact : **(1)** cold start du compute Neon (autosuspend), **(2)** cold start des fonctions serverless Vercel, **(3)** latence inter-région si Vercel n'est pas en Europe (`vercel.json` ne fixe aucune `regions`), **(4)** cascade de requêtes client sans cache serveur, **(5)** bundle lourd (KaTeX/recharts/lottie) + rendu KaTeX coûteux.
- Une « BDD interne au site » est **déconseillée** (incompatible serverless, ne résout pas le vrai problème). Pistes recommandées : aligner la région Vercel sur Neon, cache serveur sur les routes lourdes, atténuation du cold start, suppression de la cascade client.

Leviers détaillés (avantages/inconvénients, effort, coût) et recommandation hiérarchisée dans `ANALYSE_PERFORMANCE.md`. Aucune migration Prisma, aucun changement de code.

---

## Badge de catégorie Anki sur la page d'édition des cartes (31/05/2026)

### Contexte
Sur la page d'édition d'un deck (`/deck/[id]/edit`), chaque carte affichait des badges (type de contenu, image, doublon) mais aucune indication de son classement dans l'algorithme Anki. Objectif : afficher, pour les decks **ANKI** uniquement, un petit badge de catégorie par carte (Nouvelles / En apprentissage / Réapprentissage / Jeunes / Matures), avec les couleurs déjà utilisées au dashboard et dans les stats.

### Modifications
- **`lib/cardCategories.ts`** : nouvelle fonction `getCardCategory(status, interval)` — source unique de vérité côté JS de la catégorisation (jusqu'ici uniquement en SQL), alignée sur le seuil `MATURE_INTERVAL_DAYS = 21`.
- **API** `app/api/decks/[id]/cards/route.ts` et `app/api/decks/[id]/search/route.ts` : chargent désormais la `Review` de l'utilisateur courant (`status`, `interval`) par carte et exposent `learningMethod` du deck. La relation `reviews[]` est aplatie en `card.review`.
- **`app/deck/[id]/edit/components/CardListItem.tsx`** : nouvelle prop `learningMethod` ; affichage d'un badge de catégorie (pastille + label) à côté du titre de la carte, en réutilisant les classes Tailwind de `CARD_CATEGORIES`. Rien n'est affiché pour les decks IMMEDIATE.
- **`components/EditDeck/EditDeckV1.tsx` + `EditDeckV2.tsx`** : passage de `deck.learningMethod` à `CardListItem`.
- **`lib/types.ts`** : `learningMethod?` ajouté à `DeckWithCards`.

Aucune migration Prisma (champs `learningMethod`, `Review.status`, `Review.interval` déjà existants).

---

## Boucle d'apprentissage ANKI intra-session + fix fuseau `/api/review` (02/06/2026)

### Contexte
En mode ANKI, les cartes notées « Échec »/« Difficile » disparaissaient de la session au lieu de réapparaître (le mode IMMEDIATE possédait déjà une réinsertion, pas ANKI). Conséquence : le popup « Vous avez terminé pour aujourd'hui » s'affichait dès que la file statique se vidait, alors que ces cartes — replanifiées par FSRS avec un pas d'apprentissage court (`interval = 0`) — étaient redevenues dues, d'où un « X à réviser » résiduel au dashboard. S'ajoutait une incohérence de fenêtre « jour » : `/api/review` ne transmettait pas le header `X-Timezone` (contrairement au dashboard), faussant le budget restant entre les deux.

### Modifications
- **POST `/api/review`** (`app/api/review/route.ts`) : retourne désormais l'état de la review après mise à jour (`{ success, review: { status, nextReview, interval } }`), sans requête DB supplémentaire (réutilise `updatedReview`).
- **`lib/anki.ts`** : nouveau helper pur `shouldReinsertInSession(status, interval)` — vrai si `status ∈ {LEARNING, RELEARNING}` ET `interval < 1` (carte qui revient dans la journée). Une carte graduée (`REVIEW`, `interval >= 1`) sort de la session.
- **`components/Review/ReviewV2.tsx`** :
  - Branche ANKI de `handleRating` réécrite en **optimiste + réconciliation asynchrone** : retrait immédiat de la carte (UI non bloquante), puis au retour du POST, réinsertion éventuelle via `insertWithSpacing` (gap 3, cohérent avec `REVISION_INTERVALS.again`).
  - Nouvel état `pendingPosts` (POST en vol) + `useEffect` de gate : le popup « terminé » ne s'affiche que si `cardQueue` est vide **ET** `pendingPosts === 0` → gère le cas de la file vidée à 1 carte notée « Échec ».
  - Persistance `localStorage` centralisée (`persistAnki`) appelée à chaque mutation de file (retrait ET réinsertion) ; `sessionStatsRef` pour persister la dernière valeur depuis les callbacks async.
  - `fetchCards` envoie désormais le header `X-Timezone` sur `/api/review` (alignement avec `lib/store/decks.ts`).

### Comportement
Les cartes Échec/Difficile réapparaissent dans la même session jusqu'à graduation ; le popup ne s'affiche que lorsqu'il ne reste vraiment plus rien de dû ; le compteur dashboard tombe à 0 après une session complète. Cross-device couvert par le fetch serveur (les LEARNING dues sont renvoyées au prochain chargement). Aucune migration Prisma. Détail dans `log_erreurs.md` (entrée 02/06/2026).

---

**Dernière mise à jour** : 02/06/2026
