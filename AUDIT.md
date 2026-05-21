# AUDIT — Ratissage transverse du projet

> **Démarré le** : 2026-05-18
> **Objectif** : recenser et corriger les bugs, frictions UX, dette technique, problèmes de sécurité/perf du projet Mindup.
> **Source de vérité inter-session** : ce fichier. Avant de relancer un ratissage, consulter la section *Couverture* pour ne pas refaire le travail déjà effectué.

---

## Légende

### Statuts
| Symbole | Signification |
|---------|---------------|
| 🔴 | À investiguer (remonté par agent, pas encore vérifié) |
| 🟠 | Confirmé (bug reproduit/lu en code) |
| 🟢 | Corrigé |
| 🔵 | Différé (validation utilisateur requise — refactor, UX, schéma) |
| ⚪ | Faux positif (non reproduit après vérif) |

### Sévérités
| Niveau | Signification |
|--------|---------------|
| **S1** | Bug bloquant ou faille de sécurité critique |
| **S2** | Bug fonctionnel affectant un parcours utilisateur |
| **S3** | UX / qualité code / accessibilité / perf modérée |
| **S4** | Nice-to-have, cosmétique, micro-optimisation |

---

## État global des zones

| # | Zone | Statut | Findings |
|---|------|--------|----------|
| 1 | Auth & Sécurité | ratissé 2026-05-18 | 19 |
| 2 | Decks / Cartes / Review API | ratissé 2026-05-18 | 14 |
| 3 | Import / Export | ratissé 2026-05-18 | 19 |
| 4 | UI Révision & Édition | ratissé 2026-05-18 | 15 |
| 5 | Dashboard & Stats UI | ratissé 2026-05-18 | 19 |
| 6 | Public decks / Leaderboard / VeryFastMath | ratissé 2026-05-18 | 17 |
| 7 | Admin / Cron / Upload / Images | ratissé 2026-05-18 | 13 |

---

## Zone 1 — Auth & Sécurité

### [Z1-01] [S2] Refresh token retourné en clair dans le body JSON
- **Fichier** : `app/api/auth/refresh/route.ts:61-64`
- **Symptôme** : `POST /api/auth/refresh` renvoie `{ refreshToken: "..." }` dans le body JSON, accessible à tout JS qui interroge l'endpoint.
- **Cause racine** : architecture client : le client doit stocker le refresh token pour le ré-émettre. Contrairement à l'access token (cookie httpOnly), le refresh token n'est pas en cookie httpOnly.
- **Sévérité** : S2 (initialement remonté S1 ; en pratique le refresh token est en localStorage côté client donc déjà accessible à un XSS, mais sa diffusion en clair via le body augmente la surface).
- **Statut** : 🟠 confirmé
- **Action proposée** : refonte → stocker le refresh token dans un cookie httpOnly également (avec path scope `/api/auth/refresh`). Demande validation : 🔵 différé.

### [Z1-02] [S2] Race condition signup (TOCTOU sur findUnique → create)
- **Fichier** : `app/api/auth/signup/route.ts:50-52, 75`
- **Symptôme** : deux signups concurrents avec le même email peuvent tous deux passer la vérif `findUnique` puis l'un échoue en BD (P2002), exposant un message d'erreur Prisma au client.
- **Cause racine** : pas d'usage de l'unique constraint comme garde-fou primaire ; pas de catch P2002 pour renvoyer un message propre.
- **Sévérité** : S2
- **Statut** : 🟠 confirmé
- **Action proposée** : try/catch sur P2002 → message "Un compte existe déjà" propre. Bug évident, peut être corrigé.

### [Z1-03] [S3] Aucune validation de format email
- **Fichier** : `app/api/auth/signup/route.ts:33`, `app/api/auth/login/route.ts:31`
- **Symptôme** : `"foo"`, `"@"`, `"a@b"` acceptés comme email.
- **Sévérité** : S3
- **Statut** : 🟠 confirmé
- **Action proposée** : regex simple `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` + check longueur. Corrigeable.

### [Z1-04] [S3] Cookies `secure` désactivés en dev
- **Fichier** : `app/api/auth/refresh/route.ts:69`, `lib/auth.ts`
- **Symptôme** : `secure: process.env.NODE_ENV === 'production'`.
- **Statut** : ⚪ faux positif (intentionnel pour dev sur HTTP localhost — pratique standard).

### [Z1-05] [S3] Mot de passe min 8 caractères sans complexité
- **Fichier** : `app/api/auth/signup/route.ts:42`
- **Symptôme** : `"12345678"` accepté.
- **Sévérité** : S3 — décision produit
- **Statut** : 🔵 différé (UX/produit : faut-il vraiment imposer majuscule+chiffre+symbole ? À décider)

### [Z1-06] [S3] Pas d'atomicité signup + session
- **Fichier** : `app/api/auth/signup/route.ts:75-90`
- **Symptôme** : si `createSession` échoue après `createUser`, compte créé mais user non loggué.
- **Statut** : 🟠 confirmé (impact minime : user peut juste se logger ensuite)
- **Action proposée** : transaction Prisma. Peu critique.

### [Z1-07] [S3] Erreur de parsing exposée verbatim
- **Fichier** : `app/api/import/route.ts:147`, `app/api/import/analyze/route.ts:46`
- **Symptôme** : `Erreur de parsing : ${error.message}` expose stacks/chemins internes.
- **Statut** : 🟠 confirmé
- **Action proposée** : journaliser le message complet côté serveur, exposer un message générique au client.

### [Z1-08] [S4] Pas de limite de taille sur email
- **Fichier** : `app/api/auth/signup/route.ts:33`
- **Statut** : 🟠 confirmé — corrigeable trivialement (`email.length > 255 → 400`).

### [Z1-09] [S4] `generateDisplayNameFromEmail` sans sanitisation
- **Fichier** : `app/api/auth/signup/route.ts:74`, `lib/utils/display-name.ts`
- **Symptôme** : si l'email contient des caractères spéciaux/HTML, le displayName les conserve.
- **Statut** : 🟠 confirmé (impact dépend du rendu — React échappe par défaut, mais à vérifier sur tous les points d'affichage)
- **Action proposée** : strip non-alphanumériques côté serveur.

### [Z1-10] [S4] Path explicite manquant sur cookie session
- **Fichier** : `lib/auth.ts:23-28`
- **Statut** : ⚪ faux positif (Next.js applique `path: '/'` par défaut).

### [Z1-11] [S2] Middleware whitelist incomplète
- **Fichier** : `middleware.ts:9`
- **Symptôme** : `publicPaths` ne liste pas toutes les routes publiques nécessaires.
- **Statut** : 🔴 à vérifier en détail (le middleware Next.js actuel ne fait que la redirection logged-out → login)

### [Z1-12] [S3] Rate limiter en mémoire — réinitialisé au redéploiement
- **Fichier** : `lib/rate-limiter.ts:20`
- **Symptôme** : les compteurs vivent en RAM du serveur ; redéploiement → reset.
- **Statut** : 🟠 confirmé
- **Action proposée** : migrer vers stockage durable (Redis, Upstash, ou colonne BD). 🔵 différé (changement d'archi).

### [Z1-13] [S4] `verifyBearerToken` : conversion Buffer inutile
- **Fichier** : `lib/security.ts:47-50`
- **Statut** : ⚪ faux positif (le code fonctionne ; juste de la dette mineure de readability).

### [Z1-14] [S3] Pas de `nbf` (Not Before) dans le JWT
- **Fichier** : `lib/jwt.ts:9-14`
- **Statut** : ⚪ faux positif (pas de besoin actuel ; `iat`+`exp` suffisent).

### [Z1-15] [S2] Action destructive `/api/admin/cleanup` exposée en GET
- **Fichier** : `app/api/admin/cleanup/route.ts:55-90`
- **Symptôme** : un admin trompé par un `<img src="/api/admin/cleanup?target=review-events">` déclenche un cleanup.
- **Cause racine** : action mutante sur verbe GET (anti-pattern REST). L'auth admin est vérifiée mais les cookies sont auto-envoyés.
- **Sévérité** : S2 (CSRF côté admin)
- **Statut** : 🟠 confirmé
- **Action proposée** : passer en POST + sameSite=strict est déjà actif → réduit le risque mais reste anti-pattern.

### [Z1-16] [S4] Pas de confirmation 2FA sur action admin destructive
- **Fichier** : `app/api/admin/cleanup/route.ts`
- **Statut** : 🔵 différé (décision produit : ajouter un step de confirmation ?)

### [Z1-17] [S4] Pas de fonctionnalité "mot de passe oublié"
- **Statut** : 🔵 différé (décision produit)

### [Z1-18] [S4] Pas d'index explicite sur `RefreshToken.token`
- **Fichier** : `prisma/schema.prisma:201`
- **Statut** : ⚪ faux positif (l'unique constraint Prisma crée l'index automatiquement).

### [Z1-19] [S3] Index `RefreshToken.userId` à vérifier pour les requêtes par user
- **Fichier** : `prisma/schema.prisma`
- **Statut** : 🔴 à vérifier (consulter le schéma pour confirmer la présence d'un index sur userId)

---

## Zone 2 — Decks / Cartes / Review API

### [Z2-01] [S1→⚪] Quotas mode ANKI — double comptage des nouvelles cartes
- **Fichier** : `app/api/review/route.ts:124-154`
- **Symptôme remonté** : les neuves consommeraient le budget reviews deux fois.
- **Cause racine** : aucune. La requête `doneReviewsResult` (l.124) compte TOUTES les cartes révisées (toutes statuts confondus), `doneNewResult` compte les neuves. `reviewBudget = max - reviewsDoneToday` est correct car cohérent avec la doc explicite `Projet.md:171` ("les nouvelles consomment aussi le budget reviews").
- **Statut** : ⚪ faux positif

### [Z2-02] [S3] Race condition sur `nextOrder` à la création de carte
- **Fichier** : `app/api/decks/[id]/cards/route.ts:228`
- **Symptôme** : deux créations concurrentes peuvent calculer le même `nextOrder`.
- **Cause racine** : `nextOrder = deck.cards[0].order + 1` lu hors transaction, créa dans transaction sans verrou. Pas de unique constraint sur `(deckId, order)` dans `prisma/schema.prisma`.
- **Sévérité** : S3 (impact réel faible : un user crée une carte à la fois en pratique)
- **Statut** : 🟠 confirmé
- **Action proposée** : déplacer le calcul dans la transaction, ou utiliser une séquence Postgres. 🔵 différé.

### [Z2-03] [S2] Changement de méthode (IMMEDIATE↔ANKI) supprime ReviewEvent
- **Fichier** : `app/api/decks/[id]/settings/route.ts:62-76`
- **Symptôme** : `prisma.review.deleteMany` cascade-supprime les `ReviewEvent` (FK `onDelete: Cascade`) → le leaderboard et l'admin perdent l'historique du deck.
- **Cause racine** : c'est le même bug que celui corrigé sur `reset-stats` (log_erreurs `Reset deck : suppression de l'historique global`). Le pattern n'a pas été appliqué ici.
- **Sévérité** : S2
- **Statut** : 🟠 confirmé
- **Action proposée** : remplacer `deleteMany` par `updateMany` qui remet à zéro les compteurs (reps, *Count, lastReview, interval, nextReview, easeFactor, stability, difficulty, lapses, status) sans toucher aux lignes. Bug évident à corriger.

### [Z2-04] [S2] Fenêtre "today" en timezone serveur, pas en timezone user
- **Fichier** : `app/api/decks/[id]/stats/route.ts:45`, `app/api/review/route.ts:118-120`
- **Symptôme** : `new Date(); .setHours(0,0,0,0)` calcule minuit en timezone du serveur. Vercel = UTC. User en UTC+8 : à 22h locale (14h UTC), ses révisions "d'aujourd'hui" sont déjà dans "demain" UTC.
- **Sévérité** : S2 (compteurs "aujourd'hui" décalés pour users hors UTC)
- **Statut** : 🟢 corrigé 2026-05-21 (`app/api/review/route.ts`). Le client envoie désormais `X-Timezone` (Intl.DateTimeFormat), et le serveur reconstruit minuit local via `lib/dates.ts::computeLocalDayStart`. Les autres endpoints stats/global suivront dans une passe ultérieure.

### [Z2-05] [S2] Détection "carte nouvelle aujourd'hui" basée sur `Review.createdAt`
- **Fichier** : `app/api/review/route.ts:134-143`
- **Symptôme** : une carte créée le J1 jamais révisée puis vue le J7 n'est pas comptée comme "nouvelle aujourd'hui".
- **Cause racine** : pour les cartes créées manuellement (`app/api/decks/[id]/cards/route.ts:248`) ou importées, une `Review` est créée dès la création → `Review.createdAt = création de la carte`, pas première review.
- **Sévérité** : S2
- **Statut** : 🟢 corrigé 2026-05-21. Critère remplacé par `MIN(ReviewEvent.createdAt) >= todayStart` : la "première révision" est désormais reconnue via l'événement de révision le plus ancien (table `ReviewEvent`), pas via la création du record `Review`.

### [Z2-06] [S2] Budget `newBudget` mal limité dans la requête (LEFT JOIN)
- **Fichier** : `app/api/review/route.ts:188-195`
- **Symptôme remonté** : si le deck a beaucoup de cartes sans `Review`, le LIMIT pourrait être incorrect.
- **Cause racine** : la requête `SELECT ... FROM Card LEFT JOIN Review WHERE (r.id IS NULL OR r.status='NEW') LIMIT newBudget` retourne EXACTEMENT `newBudget` lignes maximum, chacune correspondant à 1 carte. La LIMIT est respectée.
- **Statut** : ⚪ faux positif

### [Z2-07] [S4] `any` sur `updateData` dans bulk-update-types
- **Fichier** : `app/api/decks/[id]/bulk-update-types/route.ts:57`
- **Statut** : 🟠 confirmé (typage à resserrer)
- **Action proposée** : `Partial<Pick<Card, 'frontType' | 'backType'>>`.

### [Z2-08] [S4] Division par zéro défendue dans `avgTimePerCard`
- **Fichier** : `app/api/decks/[id]/stats/route.ts:200-212`
- **Statut** : ⚪ faux positif (le code utilise `?? 0`).

### [Z2-09] [S3] Export sans vérif d'ownership stricte
- **Fichier** : `app/api/decks/[id]/export/route.ts:37-41`
- **Symptôme remonté** : `findUnique` avec `userId` dans where.
- **Cause racine** : Prisma `findUnique` autorise des conditions supplémentaires si une PK est présente. Ici `id` est unique, `userId: user.id` ajoute le filtre. Mais ce pattern est techniquement déprécié — préférer `findFirst`.
- **Statut** : 🟠 confirmé (à vérifier que Prisma 6 ne lance pas d'erreur runtime)
- **Action proposée** : passer à `findFirst({ where: { id, userId } })` pour expliciter. Bug évident, fix simple.

### [Z2-10] [S3] Pas de vérif owner sur `app/api/decks/[id]/search/route.ts`
- **Statut** : ⚪ faux positif (vérification présente l.50-67).

### [Z2-11] [S4] Champ `easeFactor` zombi
- **Fichier** : `prisma/schema.prisma:128`, `lib/anki.ts:88`
- **Statut** : 🟠 confirmé (dette technique connue, déjà notée dans `Projet.md`)
- **Action proposée** : 🔵 différé (suppression après période de transition).

### [Z2-12] [S4] N+1 sur `swap-all`
- **Fichier** : `app/api/decks/[id]/swap-all/route.ts:44-58`
- **Symptôme** : un UPDATE par carte (potentiellement 500+ requêtes).
- **Statut** : 🟠 confirmé
- **Action proposée** : single `UPDATE Card SET front=back, back=front, frontType=backType, backType=frontType WHERE deckId=$1` via `$executeRaw`. Optimisation simple à appliquer.

### [Z2-13] [S4] Pas de plafond max sur `LIMIT` dynamique
- **Fichier** : `app/api/review/route.ts:173, 193`
- **Statut** : 🟠 confirmé (faible risque, mais `MIN(newCardsPerDay, 1000)` serait prudent)

### [Z2-14] [S4] Possible doublon de carte entre `reviewCards` et `newCards`
- **Fichier** : `app/api/review/route.ts:156-197`
- **Statut** : ⚪ faux positif (`status='NEW'` exclut LEARNING/REVIEW/RELEARNING dans la 2ème requête, donc pas d'overlap)

---

## Zone 3 — Import / Export

### [Z3-01] [S1] Pas de validation LaTeX/contenu à l'import
- **Fichier** : `app/api/import/route.ts:172-200, 232-289`
- **Symptôme** : un CSV/XML/APKG contenant `\input{/etc/passwd}` ou tout LaTeX dangereux passe sans contrôle. La fonction `validateCardContent` n'est appelée que dans `app/api/decks/[id]/cards/route.ts:183` (création manuelle).
- **Cause racine** : oubli de validation sur les chemins d'import (3 endroits : append, split-multi-decks, single).
- **Sévérité** : S1 (faille de sécurité — bypass de la validation LaTeX)
- **Statut** : 🟠 confirmé
- **Action proposée** : appliquer `validateCardContent` à chaque carte importée. Rejeter les cartes invalides (ou skip avec log). Bug évident, fix rapide.

### [Z3-02] [S3] Regex XML non-greedy casse si `</card>` dans le contenu
- **Fichier** : `lib/parsers.ts:144`
- **Symptôme** : `const cardMatches = content.match(/<card>.*?<\/card>/g)`. Edge case si un champ contient la chaîne `</card>` (peu probable mais possible).
- **Sévérité** : S3 (edge case)
- **Statut** : 🟠 confirmé
- **Action proposée** : utiliser le parser XML directement plutôt que regex, ou faire un parsing plus robuste. 🔵 différé.

### [Z3-03] [S3] Pas de validation magic bytes ZIP pour APKG
- **Fichier** : `lib/parsers/apkg.ts` (vers `openAPKGDatabase`)
- **Symptôme** : fichier renommé `.apkg` mais non-ZIP → erreur jszip peu claire.
- **Statut** : 🔴 à investiguer (impact mineur, message d'erreur amélioré possible).

### [Z3-04] [S2] Décompression zstd sans limite de taille décompressée
- **Fichier** : `lib/parsers/apkg.ts:47-48`
- **Symptôme** : un `.apkg` de 4 Mo peut contenir une bombe zstd qui se décompresse en GB → OOM serveur.
- **Sévérité** : S2 (DoS)
- **Statut** : 🔴 à investiguer (vérifier si `fzstd` supporte une limite, sinon vérifier la taille du output post-decompress avant continuation)

### [Z3-05] [S3] Pas de validation LaTeX en mode "append"
- **Fichier** : `app/api/import/route.ts:172-200`
- **Statut** : 🟠 confirmé (cas particulier de Z3-01)

### [Z3-06] [S3] Messages d'erreur XML peu informatifs
- **Fichier** : `lib/parsers.ts:121-196`
- **Statut** : 🟠 confirmé (mineur)

### [Z3-07] [S4] Revlog Anki filtré strictement (ease 1-4)
- **Fichier** : `lib/parsers/apkg.ts:297-299`
- **Statut** : 🟠 confirmé — ease=0 silencieusement ignoré.

### [Z3-08] [S3] Absence de déduplication en mode append
- **Fichier** : `app/api/import/route.ts:172-200`
- **Symptôme** : importer 2 fois le même CSV ajoute 2× les cartes.
- **Sévérité** : S3 (décision produit : on accepte ou pas ?)
- **Statut** : 🔵 différé

### [Z3-09] [S3] Stats FSRS APKG ignorées en mode append
- **Fichier** : `app/api/import/route.ts:188-200`
- **Symptôme** : `preserveHistory` est documenté pour APKG mais le mode append (CSV/XML uniquement) n'a pas de stats à préserver. Le finding est moins critique car APKG ne supporte pas l'append (l.74 bloque).
- **Statut** : ⚪ faux positif (APKG bloqué en append l.74)

### [Z3-10] [S4] CSV : retours ligne dans champ peuvent décaler colonnes
- **Fichier** : `lib/parsers.ts:209-296`
- **Symptôme** : PapaParse gère les guillemets, donc `"\n"` dans un champ quoted est OK. Le bug n'existe que sur CSV sans quote → casse rare.
- **Statut** : 🟠 confirmé pour CSV non standard.

### [Z3-11] [S4] Carte type=2 avec ivl=0 perd son intervalle SM-2
- **Fichier** : `lib/anki-import.ts:132-133`
- **Statut** : 🟠 confirmé (edge case, fallback FSRS recadre)

### [Z3-12] [S4] Échappement nom de deck en attribut XML
- **Fichier** : `app/api/decks/[id]/export/route.ts:73`
- **Statut** : ⚪ faux positif (XMLBuilder échappe automatiquement les attributs)

### [Z3-13] [S4] CSV avec contenu contenant guillemets
- **Fichier** : `app/api/decks/[id]/export/route.ts:118-127`
- **Statut** : ⚪ faux positif (Papa.unparse échappe selon RFC 4180)

### [Z3-14] [S3] Pas de progression UI sur imports gros fichiers
- **Fichier** : `components/Import/ImportV1.tsx`, `ImportV2.tsx`
- **Statut** : 🔵 différé (UX, demande validation)

### [Z3-15] [S3] Cartes Cloze/Image Occlusion partiellement supportées
- **Statut** : ⚪ faux positif (déjà documenté comme limitation v1 dans `Projet.md:264`)

### [Z3-16] [S4] Détection LaTeX inclut pas `$$...$$` standalone
- **Fichier** : `lib/parsers.ts:22-48`
- **Statut** : ⚪ faux positif (`$` est dans `latexIndicators` l.27)

### [Z3-17] [S4] Magic number `queue >= 0` répété sans constante
- **Fichier** : `lib/parsers/apkg.ts:154, 179, 270`
- **Statut** : 🟠 confirmé (dette mineure)

### [Z3-18] [S4] Pas de test round-trip import/export
- **Statut** : 🔵 différé (dette de testing)

### [Z3-19] [S3] Limite `maxDecksPerUser` vérifiée APRÈS parsing
- **Fichier** : `app/api/import/route.ts:220`
- **Symptôme** : pour gros APKG multi-decks, parsing complet avant rejet.
- **Statut** : 🟠 confirmé
- **Action proposée** : remonter la vérif après l'extraction de la liste de decks (qui se fait rapidement) avant le parsing complet. Fix simple.

---

## Zone 4 — UI Révision & Édition

### [Z4-01] [S3] Usage massif de `alert()` / `confirm()` natifs
- **Fichiers** : `components/Review/ReviewV1.tsx:487,492`, `components/AddCards/AddCardsV1.tsx:50,58`, `components/EditDeck/EditDeckV1.tsx:109,128,166,253,288,323,348,351,375,378`
- **Symptôme** : 15× `alert()` + 3× `confirm()` natifs au lieu de toasts/modales custom. Bloque le thread principal, UX dégradée.
- **Statut** : 🟠 confirmé
- **Action proposée** : remplacer par `useToast` (déjà en place dans le projet). Fix mécanique sur ~18 sites. 🔵 différé (UX, plusieurs fichiers).

### [Z4-02] [S3] Double clic possible sur "Ajouter et continuer" pendant upload
- **Fichier** : `components/AddCards/AddCardsV1.tsx:529-540`
- **Symptôme** : bouton sans `disabled={saving}`.
- **Statut** : 🟠 confirmé
- **Action proposée** : ajouter `disabled={saving}`. Fix trivial.

### [Z4-03] [S3] Modal `BaseModal` non fermable au clic outside
- **Fichier** : `components/Modal/BaseModal.tsx:37-80`
- **Statut** : 🟠 confirmé (UX standard moderne)
- **Action proposée** : ajouter un onClick sur le backdrop. 🔵 différé (UX décision).

### [Z4-04] [S3] Modales sans gestion `Escape`
- **Fichiers** : `components/Modal/BaseModal.tsx`, modales dashboard
- **Statut** : 🟠 confirmé
- **Action proposée** : `useEffect` avec `keydown` listener qui appelle `onClose` sur `Escape`. 🔵 différé.

### [Z4-05] [S3] Focus perdu après fermeture de modale
- **Fichier** : `components/Modal/BaseModal.tsx`, `AddCardsV1.tsx:234-239`
- **Statut** : 🟠 confirmé (a11y)
- **Action proposée** : restaurer focus sur trigger précédent. 🔵 différé.

### [Z4-06] [S3] Contraste faible `text-zinc-400/500` sur fond zinc-900
- **Fichier** : `components/Review/ReviewV1.tsx:633,684-751`
- **Statut** : 🟠 confirmé (a11y WCAG AA)
- **Action proposée** : passer à `text-zinc-300` minimum. 🔵 différé.

### [Z4-07] [S3] Zones cliquables boutons rating < 44px sur iPhone SE
- **Fichier** : `components/Review/ReviewV1.tsx:711-746`
- **Statut** : 🟠 confirmé sur écrans étroits.
- **Action proposée** : `min-h-[44px]` explicite. 🔵 différé.

### [Z4-08] [S4] `requestAnimationFrame` sans cleanup au unmount
- **Fichier** : `components/AddCards/AddCardsV1.tsx:116-118`
- **Statut** : 🟠 confirmé (mineur, RAF orphelin si demount rapide).

### [Z4-09] [S4] `localStorage.setItem` sans try/catch (QuotaExceededError)
- **Fichier** : `components/Review/ReviewV1.tsx:151`, `ReviewV2.tsx`
- **Statut** : 🟠 confirmé (mineur, mode privé navigateur).

### [Z4-10] [S4] Désynchronisation toggle Texte/LaTeX rapide
- **Fichier** : `components/AddCards/AddCardsV1.tsx:167-181`
- **Statut** : 🟠 confirmé (edge case manipulation rapide).

### [Z4-11] [S4] AddCardsV1/EditDeckV1 trop gros (>500 lignes)
- **Statut** : 🔵 différé (dette de design, refacto).

### [Z4-12] [S4] `console.error` sans contexte image
- **Fichier** : `components/AddCards/AddCardsV1.tsx:198,242`
- **Statut** : 🟠 confirmé (mineur).

### [Z4-13] [S4] Pas de skeleton sur fetch initial AddCards
- **Fichier** : `components/AddCards/AddCardsV1.tsx:42-66`
- **Statut** : ⚪ faux positif (`LoadingAnimation fullScreen` est en place).

### [Z4-14] [S4] Dépendances `useCallback` larges
- **Fichier** : `components/AddCards/AddCardsV1.tsx:289-291`
- **Statut** : 🔴 à vérifier (impact perf marginal).

### [Z4-15] [S4] Double clic rating ReviewV1 avant lock
- **Fichier** : `components/Review/ReviewV1.tsx:365-495`
- **Statut** : ⚪ faux positif (flag `submitting` filtre dès le 2e clic, rollback gère l'erreur).

---

## Zone 5 — Dashboard & Stats UI

### [Z5-01] [S3] `alert()`/`confirm()` Dashboard V1
- **Fichier** : `app/dashboard/page.tsx:75,85,133,138,154,157`
- **Statut** : 🟠 confirmé (même famille que Z4-01)
- **Action proposée** : `useToast`. 🔵 différé.

### [Z5-02] [S2] `Math.max(0, ...empty)` = `-Infinity`
- **Fichier** : `components/DeckStatistics/v1/anki/ForecastChart.tsx:41`
- **Symptôme** : `Math.max(0, ...dailyForecast.map(d => d.count))` retourne `-Infinity` si tableau vide.
- **Statut** : 🟠 confirmé
- **Action proposée** : `Math.max(0, ...arr, 0)` ou `arr.length ? Math.max(...arr) : 0`. Fix trivial.

### [Z5-03] [S2] `TrueRetentionCard` affiche "Excellente" à 0 cartes matures
- **Fichier** : `components/DeckStatistics/v1/anki/TrueRetentionCard.tsx:18-24`
- **Symptôme** : si `matureCardsCount === 0`, le composant affiche un score trompeur.
- **Statut** : 🟠 confirmé
- **Action proposée** : afficher "Pas encore de cartes matures" si count=0. Fix simple.

### [Z5-04] [S2] `TrendChart` timezone serveur vs locale
- **Fichier** : `components/DeckStatistics/v1/TrendChart.tsx:27-55`
- **Statut** : 🟠 confirmé (même famille que Z2-04)
- **Action proposée** : 🔵 différé (décision timezone global).

### [Z5-05] [S2] Bouton Déconnexion V3 non-désactivé visuellement → clic multiples
- **Fichier** : `app/dashboard-v3/components/Sidebar/Sidebar.tsx:72-88`
- **Statut** : 🟠 confirmé
- **Action proposée** : `pointer-events: none` quand `isLoggingOut`. Fix simple.

### [Z5-06] [S2] `useDecks` cache `useFetch` désynchronisé avec store Zustand
- **Fichier** : `hooks/useDecks.ts:74-100`, `app/dashboard/page.tsx:96-101`
- **Statut** : 🟠 confirmé (deux sources de vérité — point déjà soulevé par commit ab6bbab mais reste résiduel)
- **Action proposée** : invalider le cache `useFetch` après mutation. 🔵 différé.

### [Z5-07] [S2] Duplication `ExtendedDeckStats` V1 vs V2
- **Fichier** : `components/DeckStatistics.tsx:12-72`, `components/DeckStatistics/DeckStatisticsV1.tsx:17-105`
- **Statut** : 🟠 confirmé (dette de typage)
- **Action proposée** : extraire dans `lib/types.ts`. Fix simple.

### [Z5-08] [S3] Modales/Dropdowns non fermables à Escape
- **Fichier** : `app/dashboard/page.tsx:481-499`, `app/dashboard-v3/page.tsx:331-348`
- **Statut** : 🟠 confirmé (même famille que Z4-04)

### [Z5-09] [S3] Graphiques Recharts sans alt/aria
- **Fichier** : `ForecastChart.tsx:56-98`, `IntervalsHistogram.tsx:54-96`
- **Statut** : 🟠 confirmé (a11y)
- **Action proposée** : 🔵 différé.

### [Z5-10] [S3] DeckHealthCard : segments <5% invisibles
- **Fichier** : `components/DeckStatistics/v1/anki/DeckHealthCard.tsx:15-27`
- **Statut** : 🟠 confirmé
- **Action proposée** : `minWidth: '4px'` au lieu de 0 pour segments non-vides. Fix simple.

### [Z5-11] [S3] Badge "X cartes à réviser" truncate sur mobile
- **Fichier** : `app/dashboard/page.tsx:273-276`
- **Statut** : 🟠 confirmé

### [Z5-12] [S3] Couleurs graphes sans pattern pour daltoniens
- **Statut** : 🟠 confirmé (a11y)
- **Action proposée** : 🔵 différé.

### [Z5-13] [S3] `reviewsYesterday` peut être négatif si `reviewsVsYesterday < -100`
- **Fichier** : `components/DeckStatistics/DeckStatisticsV1.tsx:169-172`
- **Symptôme** : formule de reverse engineering imprécise.
- **Statut** : 🟠 confirmé
- **Action proposée** : faire calculer côté serveur (déjà disponible) plutôt qu'inférer côté client. 🔵 différé.

### [Z5-14] [S3] "Estimation maîtrise" disparaît silencieusement en ANKI
- **Fichier** : `components/DeckStatistics/v1/StatsHeroSection.tsx:93-99`
- **Statut** : 🟠 confirmé (UX, transition IMMEDIATE→ANKI)

### [Z5-15] [S3] Console logs avec emojis verbeux en prod
- **Statut** : 🟠 confirmé (mineur, déjà partagé entre zones)

### [Z5-16] [S3] Magic numbers limit/take dans plusieurs routes
- **Statut** : 🟠 confirmé (dette mineure — `lib/constants.ts` existe déjà, à utiliser)

### [Z5-17] [S4] Dropdown V1 peut se ré-ouvrir si réseau lent
- **Fichier** : `app/dashboard/page.tsx:320-449`
- **Statut** : 🔴 à vérifier (edge case)

### [Z5-18] [S4] Pas de skeleton sur DeckStatisticsV1 anki blocks
- **Fichier** : `components/DeckStatistics/DeckStatisticsV1.tsx:135-151`
- **Statut** : 🟠 confirmé (UX mineur)

### [Z5-19] [S4] Pas de cache client sur leaderboards
- **Statut** : 🔵 différé (perf nice-to-have)

---

## Zone 6 — Public decks / Leaderboard / VeryFastMath

### [Z6-01] [S2] VeryFastMath : score acceptable sans vérification temporelle
- **Fichier** : `app/api/veryfastmath/save-score/route.ts:37-42`
- **Symptôme** : un client peut POST score=100 sans avoir joué 60s. Vérif `score in [0,100]` mais pas de check "temps écoulé".
- **Cause racine** : pas de session de jeu côté serveur (la durée est purement côté client).
- **Sévérité** : S2 (triche leaderboard, pas vraie faille critique)
- **Statut** : 🟠 confirmé
- **Action proposée** : ajouter un `startSession` qui retourne un token signé avec timestamp, le client le renvoie au POST score → serveur vérifie `now - tokenIssuedAt ≥ 60s`. 🔵 différé (refonte mineure).

### [Z6-02] [S2] Streak : timezone serveur vs locale user
- **Fichier** : `lib/streak.ts:9-10,75-76`
- **Statut** : 🟠 confirmé (même famille que Z2-04, Z5-04)
- **Action proposée** : 🔵 différé (décision timezone globale)

### [Z6-03] [S2] Leaderboard flashcards : pas de pagination DB
- **Fichier** : `app/api/leaderboard/route.ts:29-40`
- **Symptôme** : la requête agrège TOUS les users avant LIMIT.
- **Statut** : 🟠 confirmé (impact perf seulement avec milliers d'users actifs)
- **Action proposée** : intégrer LIMIT/OFFSET dans la requête SQL agrégée. 🔵 différé (pas urgent à l'échelle actuelle).

### [Z6-04] [S2] VeryFastMath leaderboard : pas de tie-breaker
- **Fichier** : `app/api/veryfastmath/leaderboard/route.ts:58-59`
- **Statut** : 🟠 confirmé
- **Action proposée** : `sort((a,b) => b.score - a.score || a.createdAt - b.createdAt)`. Fix simple.

### [Z6-05] [S2] VeryFastMath leaderboard : pas de pagination + agrégation RAM
- **Fichier** : `app/api/veryfastmath/leaderboard/route.ts:30-42`
- **Statut** : 🟠 confirmé
- **Action proposée** : agréger en SQL avec `DISTINCT ON (userId)` + ORDER + LIMIT. 🔵 différé.

### [Z6-06] [S2] `sync-decks` N+1 sur ajout de cartes
- **Fichier** : `lib/sync-decks.ts:308-330`
- **Symptôme** : boucle `for await tx.card.create()` au lieu de `createMany`.
- **Statut** : 🟠 confirmé
- **Action proposée** : `tx.card.createMany({ data })`. Fix simple.

### [Z6-07] [S3] VeryFastMath : pas de rate-limit sur save-score
- **Fichier** : `app/api/veryfastmath/save-score/route.ts`
- **Statut** : 🟠 confirmé
- **Action proposée** : `applyRateLimit(key='vfm-save', max=10/min)` via `lib/rate-limiter.ts`. Fix simple.

### [Z6-08] [S3] Public decks API expose `authorEmail`
- **Fichier** : `app/api/public-decks/route.ts:40-44`
- **Symptôme** : énumération possible des emails publics.
- **Statut** : 🟠 confirmé (info publique mais sensible côté privacy)
- **Action proposée** : exposer uniquement `displayName`. 🔵 différé (décision produit).

### [Z6-09] [S3] `sync-decks` : `any` sur `frontType`/`backType`
- **Fichier** : `lib/sync-decks.ts:218-223`
- **Statut** : 🟠 confirmé
- **Action proposée** : importer le type `ContentType` de Prisma. Fix simple.

### [Z6-10] [S3] Leaderboard sans indication tri DESC
- **Statut** : 🟠 confirmé (UX clarté)

### [Z6-11] [S3] Streak leaderboard : pas d'affichage timestamp dernière révision
- **Statut** : 🟠 confirmé (UX, le filtre 2j masque les streaks stale)

### [Z6-12] [S3] Magic numbers pagination dans 3 routes
- **Statut** : 🟠 confirmé (à centraliser dans `lib/constants.ts`)

### [Z6-13] [S3] Pas d'indication meilleur score perso sur leaderboard VFM
- **Statut** : 🔵 différé (UX nice-to-have)

### [Z6-14] [S3] `displayName` null possible sur leaderboard
- **Statut** : ⚪ faux positif (fallback `'Utilisateur inconnu'` côté client)

### [Z6-15] [S3] Loader leaderboard correct
- **Statut** : ⚪ faux positif (déjà géré)

### [Z6-16] [S4] Pas de cache client leaderboards
- **Statut** : 🔵 différé (nice-to-have)

### [Z6-17] [S4] N+1 sur public-decks pour displayName
- **Statut** : ⚪ faux positif (Prisma `include` génère un JOIN)

---

## Zone 7 — Admin / Cron / Upload / Images

### [Z7-01] [S1] HTTP method mismatch sur `delete-card-image` — suppression cassée
- **Fichier serveur** : `app/api/upload/delete-card-image/route.ts:11` (`export async function DELETE`)
- **Fichier clients** : 6 endroits utilisent `method: 'POST'` :
  - `components/AddCards/AddCardsV1.tsx:192,236`
  - `components/AddCards/AddCardsV2.tsx:192,236`
  - `app/deck/[id]/edit/components/CardEditor.tsx:92,163`
  - `lib/image-service.ts:58`
- **Symptôme** : suppression silencieusement cassée (405). Les images orphelines s'accumulent (le cron nettoie heureusement).
- **Cause racine** : incohérence entre l'export du handler et la méthode appelée.
- **Sévérité** : S1 (bug fonctionnel grave, fonctionnalité de l'app cassée)
- **Statut** : 🟠 confirmé
- **Action proposée** : changer `DELETE` → `POST` dans la route (1 ligne, impact zéro côté clients). Fix immédiat.

### [Z7-02] [S2] Liste users admin non paginée
- **Fichier API** : `app/api/admin/users/route.ts:11`
- **Fichier UI** : `app/admin/page.tsx:495-565`
- **Symptôme** : `findMany()` sans `take`. Côté UI : rendu de tous les users sans virtualisation.
- **Statut** : 🟠 confirmé (impact seulement à 10k+ users — pas critique aujourd'hui mais facile à corriger)
- **Action proposée** : `take: 100, skip: page*100` + pagination UI. 🔵 différé (l'app n'a pas 10k users).

### [Z7-03] [S3] DB sans index garanti sur `ReviewEvent.createdAt`
- **Fichier** : `prisma/schema.prisma`
- **Statut** : 🔴 à vérifier (Projet.md mentionne un index `(userId, lastReview)` sur Review, à confirmer pour ReviewEvent)

### [Z7-04] [S3] Image cleanup batch sans mutex inter-cron
- **Fichier** : `lib/image-cleanup.ts:126-138`
- **Statut** : 🟠 confirmé (cas marginal — le cron Vercel ne se lance qu'à 2h UTC, donc collision improbable)

### [Z7-05] [S3] `displayName` admin sans sanitization
- **Fichier** : `app/api/admin/users/[id]/display-name/route.ts:32`
- **Symptôme** : caractères de contrôle/RTL acceptés (React échappe le HTML donc pas de XSS, mais affichage moche).
- **Statut** : 🟠 confirmé
- **Action proposée** : regex `^[\p{L}\p{N} \-'.]{1,50}$` (unicode). Fix simple.

### [Z7-06] [S3] OrphanedImage retry sans limite haute en temps
- **Fichier** : `lib/image-cleanup.ts:181-191`
- **Statut** : 🟠 confirmé (dette opérationnelle)
- **Action proposée** : abandonner après 7 jours `lastRetryAt < now-7d`. 🔵 différé.

### [Z7-07] [S3] Admin cleanup sans rate-limit
- **Fichier** : `app/api/admin/cleanup/route.ts:55`
- **Statut** : 🟠 confirmé (risque DoS interne)
- **Action proposée** : sémaphore (clé en BD ou rate-limiter). 🔵 différé.

### [Z7-08] [S3] Magic bytes WEBP sans check de longueur buffer
- **Fichier** : `app/api/upload/card-image/route.ts:32-39`
- **Statut** : 🟠 confirmé (edge case, mineur)
- **Action proposée** : `buffer.length >= 12` avant accès. Fix trivial.

### [Z7-09] [S3] Upload validation correcte (Sharp réencode)
- **Fichier** : `app/api/upload/card-image/route.ts:65,92,101`
- **Statut** : ⚪ faux positif (validation MIME + magic bytes + Sharp réencode = défense en profondeur OK)

### [Z7-10] [S3] Console logs emojis en prod
- **Statut** : 🟠 confirmé (mineur, déjà partagé)

### [Z7-11] [S4] Publish endpoint sans audit log
- **Fichier** : `app/api/admin/decks/[id]/publish/route.ts:20-35`
- **Statut** : 🟠 confirmé (UX admin)

### [Z7-12] [S4] Cleanup refresh tokens non-batched
- **Statut** : 🟠 confirmé (mineur)

### [Z7-13] [S4] Cleanup queries dépendent d'indices DB sur createdAt
- **Statut** : 🔴 à vérifier (cf Z7-03)

---

## Plan d'action — Bugs évidents à corriger en priorité

Liste des findings 🟠 corrigeables sans validation supplémentaire (corrections évidentes, peu risquées) :

### Fixes critiques (S1)
| Réf | Action | Effort |
|-----|--------|--------|
| **Z7-01** | Renommer `export async function DELETE` → `POST` dans `delete-card-image/route.ts` | 1 min |
| **Z3-01** | Appliquer `validateCardContent` à chaque carte importée (3 chemins) | 15 min |

### Fixes S2
| Réf | Action | Effort |
|-----|--------|--------|
| Z2-03 | `deleteMany` → `updateMany` au changement de méthode IMMEDIATE↔ANKI | 15 min |
| Z1-02 | Catch P2002 sur signup pour message propre | 10 min |
| Z1-07 | Masquer messages parsing détaillés au client | 10 min |
| Z5-02 | `Math.max(0, ...arr, 0)` dans ForecastChart | 2 min |
| Z5-03 | TrueRetentionCard : message "pas de cartes matures" si count=0 | 5 min |
| Z5-05 | Logout button : `pointer-events-none` quand isLoggingOut | 5 min |
| Z6-04 | Tie-breaker leaderboard VFM par `createdAt` | 5 min |
| Z6-06 | sync-decks N+1 → `createMany` | 10 min |

### Fixes S3 simples
| Réf | Action | Effort |
|-----|--------|--------|
| Z1-03 | Regex email + limite longueur | 10 min |
| Z2-09 | `findUnique` → `findFirst` sur export | 2 min |
| Z2-12 | Single UPDATE pour swap-all (executeRaw) | 15 min |
| Z3-19 | maxDecksPerUser avant parsing complet APKG | 15 min |
| Z5-07 | Extraire `ExtendedDeckStats` dans `lib/types.ts` | 10 min |
| Z5-10 | `minWidth: '4px'` segments DeckHealthCard | 2 min |
| Z6-07 | Rate-limit `vfm-save-score` | 5 min |
| Z6-09 | `any` → `ContentType` Prisma dans sync-decks | 5 min |
| Z7-05 | Regex unicode pour displayName admin | 5 min |
| Z7-08 | Check buffer length avant accès magic bytes WEBP | 2 min |

### Fixes S4 triviaux (bundlés)
| Réf | Action | Effort |
|-----|--------|--------|
| Z1-08 | Limite taille email | 2 min |
| Z2-07 | Typer `updateData` proprement | 5 min |
| Z4-02 | `disabled={saving}` sur AddCards | 2 min |

### Différés en attente de validation produit (🔵)
**Sécurité/Archi** : Z1-01 (refresh token httpOnly), Z1-12 (rate-limiter durable), Z1-16/17 (2FA, mdp oublié), Z6-01 (anti-triche VFM), Z6-08 (masquer email auteur)

**Timezone (sujet transverse)** : Z2-04, Z5-04, Z6-02 — décision globale à prendre (header `X-Timezone` côté client ? Champ user.timezone ?)

**UX/Refacto** : Z1-05 (politique mdp), Z2-02 (séquence Postgres pour `order`), Z2-05 (`firstReviewedAt`), Z2-11 (suppression `easeFactor`), Z3-02 (refonte parser XML), Z3-08 (dédup append), Z3-14 (UI progression imports), Z4-01/Z5-01 (alert→toast en masse), Z4-03/Z4-04/Z4-05/Z5-08 (modales escape/outside/focus), Z4-06/Z4-07 (a11y contraste/touch targets), Z5-06 (cache useFetch/store), Z5-09/Z5-12 (a11y graphes), Z5-13 (calcul `reviewsYesterday` côté serveur), Z6-03/Z6-05 (pagination DB leaderboards), Z6-10/Z6-11 (UX leaderboards), Z7-02 (pagination admin users), Z7-06/Z7-07 (cleanup ops)

**Dette mineure** : Z3-18 (tests round-trip), Z4-11 (split AddCards), Z5-19/Z6-16 (cache client)

---

## Couverture (fichiers déjà ratissés en profondeur)

### Zone 1
- `lib/auth.ts`, `lib/jwt.ts`, `lib/security.ts`, `lib/rate-limiter.ts`, `lib/refresh-token.ts`, `lib/settings.ts`, `lib/utils/display-name.ts`
- `middleware.ts`
- `app/api/auth/{login,signup,logout,refresh,me}/route.ts`
- `app/api/user/dashboard-preference/route.ts`
- `app/api/admin/{cleanup,settings}/route.ts`, `app/api/admin/users/**`
- `app/api/cron/cleanup-images/route.ts`
- `app/api/import/{route,analyze}/route.ts` (côté auth)
- `app/api/upload/card-image/route.ts` (côté auth)
- `next.config.js`

### Zone 2
- `app/api/review/route.ts`
- `app/api/decks/route.ts`, `app/api/decks/[id]/{route,stats,reset-stats,settings,cards,search,export,swap-all,bulk-update-types}/route.ts`
- `app/api/cards/[id]/route.ts`
- `lib/{anki,revision,stats-calculations,types}.ts`
- `lib/utils/{validate-card,validate-image-url}.ts`
- `prisma/schema.prisma`, `prisma/migrations/20260516000000_add_fsrs5_fields/migration.sql`

### Zone 3
- `lib/parsers.ts`, `lib/parsers/apkg.ts`, `lib/anki-import.ts`
- `app/api/import/route.ts`, `app/api/import/analyze/route.ts`
- `app/api/decks/[id]/export/route.ts`
- `components/Import/{ImportV1,ImportV2,DeckSelectionModal}.tsx`

### Zone 4
- `components/Review/{ReviewV1,ReviewV2}.tsx`
- `components/AddCards/{AddCardsV1,AddCardsV2}.tsx`
- `components/EditDeck/{EditDeckV1,EditDeckV2}.tsx`
- `components/{CardContentDisplay,MathText,Skeleton,Toast,ErrorBoundary}.tsx`
- `components/Modal/BaseModal.tsx`

### Zone 5
- `app/dashboard/page.tsx`, `app/dashboard-v3/**` (page, layout, sidebar, mobile-sidebar, main-content)
- `app/dashboard-entry/page.tsx`
- `components/{DashboardHeader,DashboardPageWrapper,DashboardRedirector,SimpleHeader,Logo,DeckStatistics}.tsx`
- `components/DeckStatistics/DeckStatisticsV1.tsx` + V1/V2 sous-composants
- `hooks/{useDecks,useFetch}.ts`, `lib/store/decks.ts`, `lib/insights-generator.ts`

### Zone 6
- `app/api/public-decks/**` (3 routes)
- `app/api/leaderboard/{route,streak}/route.ts`
- `app/api/veryfastmath/{save-score,best-score,leaderboard}/route.ts`
- `app/api/stats/global/route.ts`
- `app/{public-decks,leaderboard,veryfastmath}/page.tsx` et sous-composants `app/veryfastmath/components/**`
- `components/PublicDecks/{PublicDecksV1,V2}.tsx`, `components/Leaderboard/{LeaderboardV1,V2}.tsx`
- `lib/sync-decks.ts`, `lib/streak.ts`

### Zone 7
- `app/admin/page.tsx`
- `app/api/admin/{users/route,users/[id]/route,users/[id]/display-name,settings,cleanup,decks/[id]/publish,decks/[id]/unpublish}/route.ts`
- `app/api/cron/cleanup-images/route.ts`
- `app/api/upload/{card-image,delete-card-image}/route.ts`
- `lib/{image-cleanup,image-service}.ts`
- `components/{ImageUploader,ImageOverlay}.tsx`
- `vercel.json`

---

## Synthèse finale (2026-05-18)

### Bilan chiffré
- **116 findings remontés** par 7 agents `Explore` sur les 7 zones.
- **~30 faux positifs** identifiés à la relecture (le plus marquant : Z2-01 "quotas doublés" = comportement intentionnel documenté).
- **17 corrections appliquées** en cette session (voir ci-dessous).
- **~60 findings différés** en `🔵` (refactos, décisions UX/produit, sujets transverses comme la timezone).
- **~9 findings résiduels en `🔴`** à investiguer dans une session ultérieure (cf indices DB, edge cases).

### Corrections appliquées dans cette session
| Réf | Sévérité | Fichier | Résumé |
|-----|----------|---------|--------|
| 🟢 Z7-01 | S1 | `app/api/upload/delete-card-image/route.ts` | `export DELETE` → `export POST` (alignement avec 6 clients) |
| 🟢 Z3-01 | S1 | `app/api/import/route.ts` | `validateCardContent` appliqué à toutes les cartes importées |
| 🟢 Z2-03 | S2 | `app/api/decks/[id]/settings/route.ts` | `deleteMany` → `updateMany` (préserve `ReviewEvent`) |
| 🟢 Z1-02 | S2 | `app/api/auth/signup/route.ts` | Catch P2002 sur race signup |
| 🟢 Z1-07 | S2 | `app/api/import/route.ts` | Erreur de parsing masquée au client |
| 🟢 Z1-03 | S3 | `app/api/auth/signup/route.ts`, `login/route.ts` | Validation regex email + limite 254 chars |
| 🟢 Z1-08 | S4 | idem | Limite taille email |
| 🟢 Z2-09 | S3 | `app/api/decks/[id]/export/route.ts` | `findUnique` → `findFirst` |
| 🟢 Z2-12 | S4 | `app/api/decks/[id]/swap-all/route.ts` | N requêtes → 1 `$executeRaw UPDATE` |
| 🟢 Z6-04 | S2 | `app/api/veryfastmath/leaderboard/route.ts` | Tie-breaker par `createdAt` |
| 🟢 Z6-06 | S2 | `lib/sync-decks.ts` | N+1 → `createMany` |
| 🟢 Z6-09 | S3 | `lib/sync-decks.ts` | `any` → `ContentType` |
| 🟢 Z6-07 | S3 | `app/api/veryfastmath/save-score/route.ts` | Rate-limit 10/min |
| 🟢 Z7-05 | S3 | `app/api/admin/users/[id]/display-name/route.ts` | Regex unicode displayName |
| 🟢 Z5-03 | S2 | `components/DeckStatistics/v1/anki/TrueRetentionCard.tsx` | Affichage neutre si pas de cartes matures |
| 🟢 Z5-10 | S3 | `components/DeckStatistics/v1/anki/DeckHealthCard.tsx` | Segments non-vides toujours visibles (min 6px) |
| 🟢 Z2-07 | S4 | `app/api/decks/[id]/bulk-update-types/route.ts` | `any` → `Prisma.CardUpdateManyMutationInput` |
| 🟢 Z4-02 | S4 | `components/AddCards/AddCardsV1.tsx`, `V2.tsx` | `disabled={saving}` sur "Ajouter et continuer" |

### Faux positifs notables (pour mémoire)
- **Z2-01** : double-comptage des nouvelles cartes ANKI — intentionnel (cf `Projet.md:171`).
- **Z5-02** : `Math.max(0, ...empty)` — le `0` agit comme valeur de fallback, retourne `0` pas `-Infinity`.
- **Z2-09 (initial)** : export sans owner check — vrai sur la forme mais Prisma résout en SQL correctement, néanmoins corrigé par souci de clarté.
- **Z7-08** : magic bytes WEBP — déjà protégé par `buffer.length >= 12` ligne 35.
- **Z1-04 / Z1-10 / Z1-13 / Z1-14 / Z1-18** : implémentations correctes ou intentionnelles.

### Vérification
- `npx tsc --noEmit` : ✅ aucune erreur dans le code de production (erreurs préexistantes uniquement dans `__tests__/` à cause des `@types/jest` manquants).
- Tests automatisés : aucun script `test` configuré dans `package.json`, donc rien à exécuter.
- Smoke test manuel : à faire par l'utilisateur (login, création deck, import CSV/APKG, révision IMMEDIATE/ANKI, stats, leaderboard).

### Prochaines sessions
Lire ce fichier puis attaquer les `🔵 différés` par thème :
1. **Timezone transverse** (Z2-04, Z5-04, Z6-02, Z5-13) — décision produit `User.timezone` + propagation.
2. **Refresh token httpOnly** (Z1-01) — refonte mineure de la lib auth.
3. **Modales accessibilité** (Z4-03/04/05, Z5-08) — pattern réutilisable (hook `useDismissable`).
4. **alert/confirm → toasts** (Z4-01, Z5-01) — fix mécanique sur ~18 sites.
5. **Pagination leaderboards** (Z6-03, Z6-05, Z7-02) — décision : SQL natif vs migration vers DISTINCT ON.
6. **Anti-triche VFM** (Z6-01) — token de session côté serveur.

Les `🔴` à investiguer concernent surtout des index DB à vérifier (Z1-19, Z7-03, Z7-13) — un coup d'œil rapide à `prisma/schema.prisma` suffira.

---

## Re-vérification du 2026-05-20

> Deuxième passe de classification : pour chaque finding 🟠/🔴 restant après la session du 2026-05-18, j'ai re-vérifié le code et classé en **rien à faire / certitude / questionnement**. Les certitudes ont été appliquées sans demande ; les questionnements ont été tranchés par l'utilisateur (réponses ci-dessous).

### Faux positifs confirmés à la re-vérification (rien à faire)

| Réf | Statut | Justification |
|-----|--------|---------------|
| Z1-19 | ⚪ | Index `RefreshToken.userId` déjà déclaré (`prisma/schema.prisma:208`). |
| Z3-05 | ⚪ | Le mode "append" hérite déjà de `sanitizeParsedDeck` (validateCardContent appliqué en amont par Z3-01). |
| Z4-09 | ⚪ | `localStorage.setItem` déjà encapsulé dans try/catch (`ReviewV1.tsx:143-151`, `ReviewV2.tsx:139-147`). |
| Z4-14 | ⚪ | Les dépendances du `useCallback` correspondent à des états réellement utilisés dans la validation — pas de recréation parasite. |
| Z5-17 | ⚪ | Pas de réouverture du dropdown : la promise async ne re-touche pas l'état d'ouverture. |
| Z7-08 | ⚪ | Buffer length déjà vérifié (`card-image/route.ts:35`). |

### Corrections appliquées (certitudes)

| Réf | Sév. | Fichier | Résumé |
|-----|------|---------|--------|
| 🟢 Z1-09 | S4 | `lib/utils/display-name.ts` | Sanitisation Unicode + trim + limite 50 chars + fallback `Utilisateur`. |
| 🟢 Z2-13 | S4 | `app/api/review/route.ts` | `MAX_REVIEW_LIMIT = 1000` plafonne `reviewBudget` / `newBudget` (y compris customStudy). |
| 🟢 Z3-17 | S4 | `lib/parsers/apkg.ts` | Constante `ANKI_QUEUE_NEW` documentée, remplace les `0` magiques aux 3 endroits. |
| 🟢 Z4-08 | S4 | `components/AddCards/AddCardsV1.tsx` | `rafIdRef` + `cancelAnimationFrame` au cleanup useEffect (évite focus orphelin). |
| 🟢 Z4-12 | S4 | `components/AddCards/AddCardsV1.tsx` | `console.error` inclut désormais `{ imagePath, error }` pour front et back. |
| 🟢 Z5-18 | S4 | `components/DeckStatistics/DeckStatisticsV1.tsx` | Skeleton allégé : 4 cards + 1 rectangle, plus de gros disque 200×200. |
| 🟢 Z6-11 | S3 | `app/api/leaderboard/streak/route.ts` | `lastStreakUpdate` exposé dans le payload pour permettre une UI "fraîcheur". |
| 🟢 Z7-11 | S4 | `app/api/admin/decks/[id]/{publish,unpublish}/route.ts` | Audit log via `prisma.auditLog.create` (table déjà présente avec `DECK_PUBLISH` / `DECK_UNPUBLISH`). |
| 🟢 Z3-03 | S3 | `lib/parsers/apkg.ts` | Validation signature ZIP (`PK\x03\x04` / `PK\x05\x06`) avant `jszip.loadAsync` → message clair. |

### Décisions utilisateur intégrées (questionnements)

| Réf | Sév. | Choix | Implémentation |
|-----|------|-------|----------------|
| 🟢 Z1-06 | S3 | **A** — compensation post-création | Si `createSession` lève, le user juste créé est supprimé (`app/api/auth/signup/route.ts`) pour permettre un nouveau signup propre. |
| 🟢 Z3-04 | S2 | **B** — limite 500 Mo | `MAX_DECOMPRESSED_BYTES = 500 * 1024 * 1024` ; `decompressZstd` lève si dépassé (`lib/parsers/apkg.ts`). |
| 🟢 Z3-07 | S4 | **B** — `ease=0` traité comme `Good` | Query SQL passe à `WHERE ease BETWEEN 0 AND 4` (`lib/parsers/apkg.ts`) ; `countRatings` mappe `case 0` sur `good` (`lib/anki-import.ts`). |
| 🟢 Z3-11 | S4 | **A** — conversion secondes→jours | `ivlDays = Math.abs(ivl) / 86400` quand `ivl < 0` ; `interval` arrondi en jours min 1 (`lib/anki-import.ts`). |
| 🟢 Z3-10 | S4 | **A** — rejet strict avec message | PapaParse `results.errors` (hors `TooManyFields` toléré en mode 2 colonnes) → erreur listant les 5 premières lignes en cause (`lib/parsers.ts`). |
| 🟢 Z7-03 | S3 | **A** — index isolé | Migration `20260520000000_add_reviewevent_createdat_index_and_cleanup_lock` : `CREATE INDEX "ReviewEvent_createdAt_idx"` + `@@index([createdAt])` dans le schéma. |
| 🟢 Z7-04 | S3 | **A** — lock optimiste | Colonne `AppSettings.imageCleanupLockedAt` ; cron pose le lock via `updateMany` conditionnel (null ou plus vieux qu'1h), libère en `finally`. Si lock déjà posé : skip propre. |
| 🟢 Z7-12 | S4 | **batch 10 000** | `cleanupExpiredTokens` boucle `$executeRaw DELETE … WHERE id IN (SELECT … LIMIT 10000)` jusqu'à épuisement (garde-fou 100 batches max). |

### Non implémenté (refusé ou différé volontairement dans cette passe)

| Réf | Raison |
|-----|--------|
| Z1-11 | Choix **B** — middleware laissé inchangé. Les pages `/public-decks`, `/leaderboard`, `/veryfastmath` restent derrière le redirect login (statu quo assumé). |
| Tous les 🔵 historiques | Restent différés : timezone transverse (Z2-04, Z5-04, Z6-02, Z5-13), refresh token httpOnly (Z1-01), modales a11y (Z4-03/04/05, Z5-08), `alert→toast` (Z4-01, Z5-01), pagination leaderboards (Z6-03, Z6-05, Z7-02), anti-triche VFM (Z6-01), refacto AddCards (Z4-11), 2FA admin (Z1-16), reset password (Z1-17), durabilité rate-limiter (Z1-12). |
| Z3-02 | Edge case `</card>` dans le contenu — reste 🔵 (refonte parser XML coûteuse, occurrence très improbable). |

### Vérification

- `npx prisma generate` : ✅ client régénéré.
- `npx tsc --noEmit` : ✅ aucune erreur dans le code de production (les erreurs `__tests__/` préexistantes restent inchangées — `@types/jest` manquant, déjà identifié dans la passe du 2026-05-18).
- **Migration à appliquer manuellement** : `npx prisma migrate deploy` (en prod) ou `npx prisma migrate dev` (en local) pour exécuter `20260520000000_add_reviewevent_createdat_index_and_cleanup_lock`.
- Smoke test recommandé (utilisateur) : signup (transaction), import APKG (zstd 500 Mo + magic bytes + ease=0 + ivl<0 + CSV strict), leaderboard streak (lastStreakUpdate), admin publish/unpublish (audit log), cron cleanup images (lock).
