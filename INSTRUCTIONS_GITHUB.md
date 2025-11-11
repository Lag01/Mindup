# Instructions de déploiement et configuration - Mindup

## État actuel du projet

✅ **Complété**
- Correction de la configuration Tailwind CSS v4
- Ajout de la fonctionnalité PWA (manifest, service worker, icônes)
- Création du schéma de base de données Neon (toutes les tables créées)
- Commit et push sur GitHub (repo: Lag01/Mindup)

⚠️ **Action requise de votre part**
- Configurer les variables d'environnement sur Vercel (instructions ci-dessous)

---

## 1. Configurer les variables d'environnement sur Vercel

Le build Vercel échouera tant que ces variables ne sont pas configurées.

### Étapes :

1. **Aller sur votre projet Vercel**
   - URL : https://vercel.com/erwan-guezingar/mindup
   - Ou via : https://vercel.com → Sélectionner le projet "mindup"

2. **Accéder aux paramètres**
   - Cliquer sur "Settings" dans le menu du haut
   - Puis "Environment Variables" dans le menu latéral

3. **Ajouter les variables suivantes**

   **Variable 1 : DATABASE_URL**
   ```
   Nom: DATABASE_URL
   Valeur: postgresql://neondb_owner:REDACTED_DB_PASSWORD@ep-wandering-glitter-ag8ef98y-pooler.c-2.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
   Environnements: Production, Preview, Development (cocher les 3)
   ```

   **Variable 2 : SESSION_SECRET**
   ```
   Nom: SESSION_SECRET
   Valeur: REDACTED_SESSION_SECRET
   Environnements: Production, Preview, Development (cocher les 3)
   ```

4. **Sauvegarder**
   - Cliquer sur "Save" pour chaque variable

---

## 2. Redéployer l'application

Après avoir configuré les variables d'environnement :

### Option A : Redéploiement automatique
- Vercel va automatiquement redéployer l'application
- Ou allez dans l'onglet "Deployments" et cliquez sur "Redeploy" sur le dernier déploiement

### Option B : Nouveau commit (si besoin)
```bash
cd "C:\Users\lumin\Documents\Code\Site de révision\flashcards-app"
git commit --allow-empty -m "Trigger redeploy"
git push
```

---

## 3. Vérifier le déploiement

1. **Attendre la fin du build** (2-3 minutes)
   - Aller sur https://vercel.com/erwan-guezingar/mindup/deployments
   - Le statut doit passer de "Building" à "Ready"

2. **Tester l'application**
   - Cliquer sur le lien de déploiement (URL en .vercel.app)
   - Créer un compte de test
   - Vérifier que la connexion fonctionne

3. **Tester la PWA**
   - Ouvrir l'application sur mobile (ou Chrome en mode mobile)
   - Devrait voir une option "Installer l'application" ou "Ajouter à l'écran d'accueil"
   - Installer l'application
   - L'icône Mindup devrait apparaître sur votre écran d'accueil

---

## 4. Fonctionnalités de l'application

### Pages disponibles
- `/` : Connexion/Inscription (page d'accueil protégée)
- `/dashboard` : Liste des decks avec statistiques
- `/import` : Importer des decks (XML ou CSV)
- `/deck/[id]/review` : Réviser un deck avec l'algorithme FSRS

### Format des fichiers d'import

#### XML (exemple : Revision Term V6.xml)
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

#### CSV
```csv
Front,Back
Question 1,Réponse 1
Question 2,Réponse 2
```

### Système de révision
- **Échec** : Carte difficile, révision à court terme
- **Difficile** : Intervalle de révision court
- **Bon** : Intervalle de révision moyen
- **Facile** : Intervalle de révision long

L'algorithme FSRS ajuste automatiquement les intervalles de révision.

---

## 5. Base de données Neon

### Informations
- **Projet** : Mindup (raspy-dawn-60994491)
- **Région** : AWS EU Central 1 (Francfort)
- **PostgreSQL** : Version 17
- **État** : ✅ Tables créées et prêtes

### Tables créées
- `User` : Utilisateurs (id, email, password, createdAt)
- `Deck` : Decks de flashcards (id, userId, name, createdAt)
- `Card` : Cartes individuelles (id, deckId, front, back, order)
- `Review` : Historique de révision avec données FSRS (id, cardId, userId, due, stability, difficulty, etc.)

### Connexion à la base de données (si besoin)
```
postgresql://neondb_owner:REDACTED_DB_PASSWORD@ep-wandering-glitter-ag8ef98y-pooler.c-2.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

---

## 6. Développement local (optionnel)

Si vous voulez tester en local :

```bash
# Créer un fichier .env.local
cd "C:\Users\lumin\Documents\Code\Site de révision\flashcards-app"
copy .env.local.example .env.local

# Installer les dépendances (si pas déjà fait)
npm install

# Générer le client Prisma
npx prisma generate

# Lancer le serveur de développement
npm run dev
```

Ouvrir http://localhost:3000

---

## 7. PWA - Icônes personnalisées (optionnel)

L'application utilise actuellement une icône SVG simple avec la lettre "M".

### Pour créer des icônes personnalisées :

1. **Remplacer l'icône SVG**
   - Éditer `public/icon.svg` avec votre propre design
   - Ou créer une nouvelle icône avec votre logo

2. **Convertir en PNG (optionnel mais recommandé)**
   - Aller sur https://cloudconvert.com/svg-to-png
   - Convertir `public/icon.svg` en PNG 192x192 et 512x512
   - Mettre à jour `public/manifest.json` pour utiliser les PNG

3. **Tester**
   - Redéployer sur Vercel
   - Vérifier l'icône sur mobile

---

## 8. Personnalisation

### Nom de l'application
Pour changer le nom de "Mindup" :
- Modifier `app/layout.tsx` (ligne 6 : title)
- Modifier `public/manifest.json` (lignes 2-3 : name et short_name)

### Couleurs du thème
Pour changer les couleurs :
- `app/globals.css` : Variables CSS `--background` et `--foreground`
- `public/manifest.json` : `background_color` et `theme_color`
- `tailwind.config.ts` : Couleurs personnalisées

---

## 9. Dépannage

### Le build échoue sur Vercel
- Vérifier que les variables d'environnement sont bien configurées
- Vérifier les logs de build sur Vercel

### Erreur de connexion à la base de données
- Vérifier que `DATABASE_URL` est correctement configuré
- Vérifier que les tables existent dans Neon (via le dashboard Neon)

### La PWA ne s'installe pas
- Vérifier que vous êtes sur HTTPS (Vercel utilise HTTPS par défaut)
- Vérifier que `public/manifest.json` est accessible
- Vérifier dans les DevTools Chrome : Application → Manifest

### L'authentification ne fonctionne pas
- Vérifier que `SESSION_SECRET` est configuré
- Vérifier que les cookies sont activés dans le navigateur

---

## 10. Ressources

- **GitHub** : https://github.com/Lag01/Mindup
- **Vercel** : https://vercel.com/erwan-guezingar/mindup
- **Neon** : https://console.neon.tech/app/projects/raspy-dawn-60994491
- **Documentation Prisma** : https://www.prisma.io/docs
- **Documentation Next.js** : https://nextjs.org/docs
- **Documentation FSRS** : https://github.com/open-spaced-repetition/ts-fsrs

---

## Support

Pour toute question ou problème :
1. Vérifier les logs de build sur Vercel
2. Vérifier les logs de la base de données sur Neon
3. Consulter la documentation ci-dessus

Bonne révision ! 📚
