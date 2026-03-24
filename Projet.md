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

---

**Derniere mise a jour** : 25/03/2026
