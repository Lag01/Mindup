# Application de Flashcards avec FSRS

Application web de révision par flashcards utilisant l'algorithme FSRS (Free Spaced Repetition Scheduler) pour optimiser la mémorisation. Conçue pour mobile-first avec un thème sombre.

## Fonctionnalités

- Authentification par email/mot de passe
- Import de decks de flashcards (XML et CSV)
- Système de révision espacée avec algorithme FSRS
- Rendu LaTeX pour les formules mathématiques
- Interface mobile-first avec thème sombre
- Statistiques de révision par deck

## Technologies

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Base de données**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentification**: bcrypt + sessions
- **Algorithme**: ts-fsrs
- **LaTeX**: KaTeX
- **Déploiement**: Vercel

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
Créer un fichier `.env` à la racine du projet :
```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
SESSION_SECRET="votre-secret-key-min-32-caracteres"
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

## Configuration Neon

1. Créer un compte sur [Neon](https://neon.tech)
2. Créer un nouveau projet
3. Copier l'URL de connexion PostgreSQL
4. Ajouter l'URL dans le fichier `.env` comme `DATABASE_URL`

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
   - `SESSION_SECRET` : Clé secrète pour les sessions (min 32 caractères)
4. Déployer

## Utilisation

1. **Inscription/Connexion** : Créer un compte ou se connecter
2. **Importer un deck** : Uploader un fichier XML ou CSV
3. **Réviser** : Sélectionner un deck et commencer la révision
4. **Évaluer** : Pour chaque carte, choisir entre :
   - **Échec** : Carte à revoir bientôt
   - **Difficile** : Intervalle de révision court
   - **Bon** : Intervalle de révision moyen
   - **Facile** : Intervalle de révision long

L'algorithme FSRS ajuste automatiquement les intervalles de révision en fonction de vos performances.

## Structure du projet

```
flashcards-app/
├── app/
│   ├── api/           # Routes API
│   ├── dashboard/     # Page du dashboard
│   ├── deck/          # Pages de révision
│   ├── import/        # Page d'import
│   └── page.tsx       # Page de connexion
├── components/        # Composants réutilisables
├── lib/              # Utilitaires et logique métier
├── prisma/           # Schéma de base de données
└── public/           # Assets statiques
```
