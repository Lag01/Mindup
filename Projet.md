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

**Reset deck : suppression de l'historique global du leaderboard et de l'admin**
- Symptôme : réinitialiser les stats d'un deck faisait disparaître les révisions correspondantes du leaderboard et du dashboard admin.
- Cause : `prisma.review.deleteMany` cascade-deletait les `ReviewEvent` associés (`Review.events` en `onDelete: Cascade` dans `prisma/schema.prisma:160`). Or le leaderboard (`api/leaderboard/route.ts`) et l'admin (`app/admin/page.tsx` via `_count.reviewEvents`) lisent précisément `ReviewEvent`.
- Correction : `app/api/decks/[id]/reset-stats/route.ts` — passage à `prisma.review.updateMany` qui remet à zéro les compteurs (`reps`, `*Count`, `lastReview`, `interval`, `nextReview`, `easeFactor`, `status`) sans supprimer les lignes `Review`. `ReviewEvent` est ainsi préservé.

---

**Dernière mise à jour** : 08/05/2026
