# Application de Flashcards - Mindup

Application web de révision par flashcards avec **système de révision immédiate** permettant des sessions infinies et un apprentissage intensif. Conçue pour mobile-first avec un thème sombre.

## Fonctionnalités

### Révision et apprentissage
- ♾️ **Système de révision immédiate** : sessions infinies sans limitation
- 🎯 **File dynamique** : les cartes reviennent selon votre performance
- 📐 Rendu LaTeX pour les formules mathématiques (KaTeX)
- 🖼️ **Support des images** : ajoutez des images sur le recto et/ou le verso des cartes
- 🖱️ **Retournement au clic** : cliquez sur la carte pour la retourner (PC et mobile)
- 📱 Interface mobile-first optimisée avec thème sombre
- 📊 Statistiques de révision par deck et par session

### Gestion des decks
- 🔐 Authentification par email/mot de passe
- 📥 Import de decks de flashcards (XML et CSV)
- 📤 Export de decks (XML et CSV)
- 🌐 **Decks publics** : partagez vos decks avec la communauté
- 🔄 **Synchronisation automatique** : les decks importés se mettent à jour automatiquement
- ✏️ Édition rapide et gestion des cartes
- 🔀 Permutation recto/verso en masse

### Jeux et compétition
- 🎮 **VeryFastMath** : jeu de calcul rapide (addition, soustraction, multiplication, division)
- 🏆 Leaderboards globaux (flashcards et VeryFastMath)
- ⏱️ Mode défi avec chronomètre
- 📱 Support multitouch optimisé pour mobile

### Administration
- 👥 Gestion des utilisateurs
- ⚙️ Configuration des limites (decks par utilisateur, nombre max d'utilisateurs)
- 📢 Publication/dépublication de decks

## Technologies

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Frontend**: React 19
- **Styling**: Tailwind CSS v4
- **Base de données**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentification**: bcrypt + sessions HTTP-only
- **Stockage d'images**: Vercel Blob
- **Algorithme**: Révision immédiate avec file dynamique
- **LaTeX**: KaTeX
- **Graphiques**: Recharts
- **PWA**: Service Worker pour utilisation offline
- **Déploiement**: Vercel (avec cron jobs)

## Installation

1. Cloner le repository :
```bash
git clone <url-du-repo>
cd flashcards-app
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
Créer un fichier `.env.local` à la racine du projet :
```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
BLOB_READ_WRITE_TOKEN="votre-token-vercel-blob"
```

4. Initialiser la base de données :
```bash
npx prisma generate
npx prisma db push
```

5. Lancer le serveur de développement :
```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Configuration

### Base de données Neon

1. Créer un compte sur [Neon](https://neon.tech)
2. Créer un nouveau projet
3. Copier l'URL de connexion PostgreSQL
4. Ajouter l'URL dans le fichier `.env.local` comme `DATABASE_URL`

### Stockage d'images Vercel Blob

1. Créer un compte sur [Vercel](https://vercel.com)
2. Créer un Blob Store dans votre projet
3. Copier le token Read/Write
4. Ajouter le token dans le fichier `.env.local` comme `BLOB_READ_WRITE_TOKEN`

## Formats d'import

### XML
```xml
<deck name="Mon Deck">
  <cards>
    <card>
      <tex name='Front'>Question</tex>
      <tex name='Back'>Réponse</tex>
    </card>
  </cards>
</deck>
```

### CSV
```csv
Front,Back
Question 1,Réponse 1
Question 2,Réponse 2
```

## Déploiement sur Vercel

1. Créer un compte sur [Vercel](https://vercel.com)
2. Importer le repository GitHub
3. Configurer les variables d'environnement :
   - `DATABASE_URL` : URL de connexion Neon
   - `BLOB_READ_WRITE_TOKEN` : Token Vercel Blob pour le stockage d'images
4. Configurer le cron job pour le nettoyage d'images (dans `vercel.json`)
5. Déployer

## Utilisation

### Démarrage

1. **Inscription/Connexion** : Créer un compte ou se connecter
2. **Importer un deck** : Uploader un fichier XML ou CSV
3. **Réviser** : Sélectionner un deck et commencer la révision

### Système de révision immédiate

Notre système fonctionne avec une **file dynamique** qui s'adapte en temps réel à vos réponses :

4. **Évaluer** : Pour chaque carte, choisir entre :
   - 🔴 **Échec (Again)** : La carte revient dans **3 cartes**
   - 🟠 **Difficile (Hard)** : La carte revient dans **5 cartes**
   - 🟢 **Bien (Good)** : La carte revient dans **8 cartes**
   - 🔵 **Facile (Easy)** : Continue dans la rotation principale (pas de réinsertion immédiate)

### Avantages

- ♾️ **Sessions infinies** : Révisez aussi longtemps que vous voulez
- 🎯 **Feedback immédiat** : Les cartes difficiles reviennent rapidement
- 📈 **Statistiques en temps réel** : Suivez votre progression pendant la session
- 🔄 **Rotation automatique** : Quand toutes les cartes sont révisées, la file recommence

Pour plus de détails, consultez [REVISION_ALGORITHM.md](REVISION_ALGORITHM.md).

### Images dans les cartes

Vous pouvez désormais enrichir vos cartes avec des images :

- **Upload sécurisé** : Téléchargez des images depuis votre ordinateur (PNG, JPG, GIF, WEBP)
- **Compression automatique** : Les images sont compressées côté client avant l'upload
- **Taille maximale** : 5MB par image
- **Contenu mixte** : Combinez texte/LaTeX et image sur le même côté
- **Gestion flexible** : Ajoutez, remplacez ou supprimez des images à tout moment

Les images sont stockées sur **Vercel Blob** et sont automatiquement nettoyées lors de la suppression des cartes grâce à un cron job quotidien.

### Retournement des cartes

Deux méthodes pour retourner une carte en mode révision :

- **Bouton "Retourner"** : Méthode classique toujours disponible
- **Clic sur la carte** : Cliquez directement sur la carte (PC et mobile)
- **Support clavier** : Appuyez sur `Espace` ou `Enter` pour retourner

Le retournement au clic est désactivé une fois la carte retournée pour éviter les clics accidentels pendant la notation.

### Decks publics et partage

- **Marketplace** : Parcourez les decks partagés par la communauté
- **Import en un clic** : Importez les decks publics dans votre collection
- **Synchronisation automatique** : Les decks importés se mettent à jour quand l'auteur les modifie
- **Statistiques** : Voyez combien de personnes ont importé chaque deck

### VeryFastMath

Mode de jeu pour s'entraîner au calcul mental rapide :

- **4 modes de jeu** : Addition, Soustraction, Multiplication, Division
- **Chronomètre** : 1 minute par partie
- **Support mobile** : Multitouch simultané pour une saisie rapide
- **Leaderboard** : Comparez vos scores avec les autres joueurs
- **Détection de records** : Notification quand vous battez votre meilleur score

## Architecture

```mermaid
graph TB
    subgraph Client["Client (React 19)"]
        UI[Pages & Composants]
        Store[Zustand Store]
        SW[Service Worker PWA]
    end

    subgraph API["API Routes (Next.js 16)"]
        Auth["/api/auth/*<br>Login, Signup, Refresh, Logout"]
        Decks["/api/decks/*<br>CRUD, Import, Export"]
        Review["/api/review<br>Immédiat + ANKI"]
        Upload["/api/upload/*<br>Images (admin)"]
        Public["/api/public-decks/*<br>Marketplace"]
        Admin["/api/admin/*<br>Users, Settings"]
        Game["/api/veryfastmath/*<br>Scores, Leaderboard"]
        Cron["/api/cron/*<br>Cleanup images"]
    end

    subgraph Security["Sécurité"]
        JWT[JWT + Cookies httpOnly]
        Rate[Rate Limiter IP]
        CSP[CSP + HSTS + Headers]
        Magic[Magic Bytes Validation]
    end

    subgraph Data["Stockage"]
        DB[(Neon PostgreSQL<br>via Prisma)]
        Blob[Vercel Blob<br>Images]
    end

    UI --> Auth & Decks & Review & Upload & Public & Game
    Auth --> JWT --> DB
    Decks --> Rate --> DB
    Review --> DB
    Upload --> Magic --> Blob
    Admin --> DB
    Cron --> Blob
    Public --> DB
```

## Structure du projet

```
flashcards-app/
├── app/
│   ├── api/
│   │   ├── admin/          # Administration
│   │   ├── auth/           # Authentification
│   │   ├── cards/          # Gestion des cartes
│   │   ├── cron/           # Tâches planifiées (cleanup images)
│   │   ├── decks/          # Gestion des decks
│   │   ├── leaderboard/    # Classements globaux
│   │   ├── public-decks/   # Decks publics
│   │   ├── review/         # Système de révision
│   │   ├── stats/          # Statistiques globales
│   │   ├── upload/         # Upload d'images
│   │   └── veryfastmath/   # Jeu VeryFastMath
│   ├── admin/              # Panneau d'administration
│   ├── dashboard/          # Page du dashboard
│   ├── deck/
│   │   └── [id]/
│   │       ├── add/        # Ajout rapide de cartes
│   │       ├── edit/       # Édition de deck
│   │       ├── review/     # Révision
│   │       └── stats/      # Statistiques
│   ├── import/             # Import de decks
│   ├── leaderboard/        # Classements
│   ├── public-decks/       # Marketplace de decks
│   ├── veryfastmath/       # Jeu de calcul mental
│   └── page.tsx            # Page de connexion
├── components/
│   ├── CardContentDisplay.tsx  # Affichage mixte texte+image
│   ├── CreateDeckModal.tsx     # Création de deck
│   ├── DeckStatistics.tsx      # Graphiques de stats
│   ├── EditDeckNameModal.tsx   # Renommage de deck
│   ├── ImageOverlay.tsx        # Lightbox pour images
│   ├── ImageUploader.tsx       # Upload d'images
│   └── MathText.tsx            # Rendu LaTeX
├── lib/
│   ├── auth.ts             # Authentification
│   ├── fsrs.ts             # Utilitaires FSRS (legacy)
│   ├── image-cleanup.ts    # Nettoyage images orphelines
│   ├── parsers.ts          # Parseurs XML/CSV
│   ├── prisma.ts           # Client Prisma
│   ├── rate-limiter.ts     # Limitation de débit
│   ├── revision.ts         # Logique de révision immédiate
│   ├── settings.ts         # Gestion des paramètres
│   └── sync-decks.ts       # Synchronisation des decks
├── prisma/
│   └── schema.prisma       # Schéma de base de données
└── public/
    └── sw.js               # Service Worker (PWA)
```

## Roadmap

### Améliorations prévues
- [ ] Tests unitaires et d'intégration
- [ ] Tags et catégories pour les cartes
- [ ] Objectifs quotidiens et streaks
- [ ] Mode QCM et mode typing
- [ ] Groupes et partage en classe
- [ ] Générateur de cartes IA
- [ ] Import depuis Anki et Quizlet
- [ ] Application mobile native

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

MIT
