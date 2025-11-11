# Instructions pour créer le repo GitHub et déployer

## Créer le repo GitHub

### Option 1 : Interface web
1. Aller sur https://github.com/new
2. Nom du repo : `flashcards-app`
3. Visibilité : Public
4. Ne PAS cocher "Initialize this repository with a README"
5. Cliquer sur "Create repository"

### Option 2 : Ligne de commande
Depuis le dossier du projet, exécuter :
```bash
git remote add origin https://github.com/VOTRE-USERNAME/flashcards-app.git
git branch -M main
git push -u origin main
```

## Déployer sur Vercel

1. Aller sur https://vercel.com
2. Cliquer sur "Add New Project"
3. Importer le repo GitHub `flashcards-app`
4. Configurer les variables d'environnement :
   - `DATABASE_URL` : Votre URL de connexion Neon PostgreSQL
   - `SESSION_SECRET` : Une chaîne aléatoire d'au moins 32 caractères

5. Cliquer sur "Deploy"

## Configurer Neon (si pas déjà fait)

1. Aller sur https://neon.tech
2. Créer un compte / Se connecter
3. Créer un nouveau projet
4. Copier l'URL de connexion PostgreSQL
5. Ajouter cette URL comme variable `DATABASE_URL` sur Vercel

## Initialiser la base de données

Après le premier déploiement sur Vercel :
1. Aller dans l'onglet "Settings" de votre projet Vercel
2. Dans la section "Environment Variables", vérifier que `DATABASE_URL` est défini
3. La base de données sera automatiquement initialisée au premier déploiement (via `prisma generate` dans le script postinstall)
4. Pour appliquer le schéma, vous pouvez soit :
   - Utiliser Prisma Studio localement avec votre DATABASE_URL de production
   - Ou exécuter `npx prisma db push` localement avec la DATABASE_URL de production

## Générer un SESSION_SECRET

Pour générer une clé aléatoire sécurisée :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ou utiliser un générateur en ligne : https://generate-random.org/api-key-generator
