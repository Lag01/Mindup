# Application de Flashcards - Mindup

Application web de révision par flashcards avec **système de révision immédiate** permettant des sessions infinies et un apprentissage intensif. Conçue pour mobile-first avec un thème sombre.

## Fonctionnalités

- 🔐 Authentification par email/mot de passe
- 📥 Import de decks de flashcards (XML et CSV)
- ♾️ **Système de révision immédiate** : sessions infinies sans limitation
- 🎯 **File dynamique** : les cartes reviennent selon votre performance
- 📐 Rendu LaTeX pour les formules mathématiques
- 📱 Interface mobile-first optimisée avec thème sombre
- 📊 Statistiques de révision par deck et par session

## Technologies

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Base de données**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentification**: bcrypt + sessions HTTP-only
- **Algorithme**: Révision immédiate avec file dynamique
- **LaTeX**: KaTeX
- **PWA**: Service Worker pour utilisation offline
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

### Démarrage

1. **Inscription/Connexion** : Créer un compte ou se connecter
2. **Importer un deck** : Uploader un fichier XML ou CSV
3. **Réviser** : Sélectionner un deck et commencer la révision

### Système de révision immédiate

Notre système fonctionne avec une **file dynamique** qui s'adapte en temps réel à vos réponses :

4. **Évaluer** : Pour chaque carte, choisir entre :
   - 🔴 **Échec** : La carte revient dans **3 cartes**
   - 🟠 **Difficile** : La carte revient dans **8 cartes**
   - 🟢 **Bien** : La carte revient dans **15 cartes**
   - 🔵 **Facile** : La carte revient dans **30 cartes**

### Avantages

- ♾️ **Sessions infinies** : Révisez aussi longtemps que vous voulez
- 🎯 **Feedback immédiat** : Les cartes difficiles reviennent rapidement
- 📈 **Statistiques en temps réel** : Suivez votre progression pendant la session
- 🔄 **Rotation automatique** : Quand toutes les cartes sont révisées, la file recommence

Pour plus de détails, consultez [REVISION_ALGORITHM.md](REVISION_ALGORITHM.md).

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
