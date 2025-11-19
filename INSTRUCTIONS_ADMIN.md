# Instructions de mise en place du tableau de bord admin

## Résumé des modifications

J'ai ajouté un système d'administration complet à votre application avec les fonctionnalités suivantes :

### ✅ Fonctionnalités implémentées

1. **Rôle administrateur** : Un champ `isAdmin` a été ajouté au modèle User
2. **Tableau de bord admin** accessible à `/admin` permettant de :
   - Voir la liste de tous les utilisateurs avec leurs statistiques
   - Supprimer des utilisateurs
   - Modifier les paramètres de l'application (limites)
3. **Paramètres configurables** :
   - Nombre maximum de decks par utilisateur (défaut: 10)
   - Nombre maximum d'utilisateurs total (défaut: 5)
4. **Limites appliquées** :
   - Blocage de l'import/création de deck au-delà de 10 decks
   - Blocage des inscriptions au-delà de 5 comptes
5. **Bouton Admin** dans le dashboard (visible uniquement pour les admins)

---

## 🚀 Étapes pour finaliser l'installation

### 1. Installer la dépendance `tsx` (pour exécuter le script TypeScript)

```bash
cd flashcards-app
npm install --save-dev tsx
```

### 2. Appliquer la migration de base de données

**Option A : Si votre base de données est accessible**

```bash
npx prisma migrate deploy
```

**Option B : Si vous devez créer une nouvelle migration**

```bash
npx prisma migrate dev --name add_admin_and_settings
```

Cela va :
- Ajouter le champ `isAdmin` à la table User
- Créer la table `AppSettings` avec les paramètres par défaut

### 3. Générer le client Prisma mis à jour

```bash
npx prisma generate
```

### 4. Passer votre compte en administrateur

Une fois la migration appliquée, exécutez le script pour passer votre compte (`erwanguezingar01@gmail.com`) en admin :

```bash
npm run make-admin
```

Vous devriez voir un message de confirmation :
```
✅ L'utilisateur erwanguezingar01@gmail.com est maintenant administrateur !
```

**Note** : Si le compte n'existe pas encore, créez-le d'abord via la page d'inscription de l'application.

### 5. Redémarrer le serveur de développement

```bash
npm run dev
```

---

## 📱 Utilisation du tableau de bord admin

### Accès au tableau de bord

1. Connectez-vous avec votre compte admin (`erwanguezingar01@gmail.com`)
2. Dans le dashboard, vous verrez maintenant un bouton **"Administration"** (violet) dans le header
3. Cliquez dessus pour accéder au tableau de bord admin

### Fonctionnalités disponibles

#### 📊 Statistiques globales
- Nombre d'utilisateurs inscrits vs limite
- Total de decks créés
- Total de révisions effectuées

#### 👥 Gestion des utilisateurs
- Liste complète des utilisateurs avec :
  - Email
  - Rôle (Admin ou Utilisateur)
  - Date d'inscription
  - Nombre de decks
  - Nombre de révisions
- Bouton de suppression pour chaque utilisateur (sauf vous-même)

#### ⚙️ Paramètres de l'application
- **Nombre maximum de decks par utilisateur** : Modifiable en temps réel
- **Nombre maximum d'utilisateurs total** : Modifiable en temps réel
- Les changements sont appliqués immédiatement

---

## 🔒 Limites appliquées

### Limite de decks (10 par défaut)
- Lors de l'import d'un deck, si l'utilisateur a déjà atteint la limite, un message d'erreur s'affiche
- Message : *"Vous avez atteint la limite de X decks par compte. Supprimez un deck avant d'en importer un nouveau."*

### Limite d'utilisateurs (5 par défaut)
- Lors de l'inscription, si le nombre maximum est atteint, l'inscription est bloquée
- Message : *"Les inscriptions sont fermées. Le nombre maximum de X comptes a été atteint."*

**Important** : Ces limites s'appliquent à TOUS les utilisateurs, y compris les admins.

---

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers créés
```
prisma/
  migrations/20250119_add_admin_and_settings/
    migration.sql                    # Migration SQL
  schema.prisma                      # ✏️ Modifié

scripts/
  make-admin.ts                      # Script pour passer un compte en admin

lib/
  settings.ts                        # Helpers pour les paramètres

app/
  admin/
    page.tsx                         # Page du tableau de bord admin
  api/
    admin/
      users/
        route.ts                     # GET : Liste des utilisateurs
        [id]/
          route.ts                   # DELETE : Supprimer un utilisateur
      settings/
        route.ts                     # GET/PATCH : Gérer les paramètres
```

### Fichiers modifiés
```
lib/auth.ts                          # Ajout de getCurrentUserWithAdmin() et requireAdmin()
app/api/auth/me/route.ts             # Retourne maintenant le champ isAdmin
app/api/import/route.ts              # Vérification de la limite de decks
app/api/auth/signup/route.ts         # Vérification de la limite d'utilisateurs
app/dashboard/page.tsx               # Ajout du bouton "Administration"
package.json                         # Ajout des scripts make-admin et migrate
```

---

## 🛡️ Sécurité

- ✅ Toutes les routes admin vérifient que l'utilisateur est authentifié ET admin
- ✅ Un admin ne peut pas supprimer son propre compte
- ✅ Les mots de passe sont toujours hachés avec bcrypt
- ✅ Les sessions utilisent des cookies HTTP-only
- ✅ Validation des données entrantes sur toutes les routes

---

## ❓ En cas de problème

### La base de données n'est pas accessible
- Vérifiez que votre fichier `.env` contient une `DATABASE_URL` valide
- Vérifiez que votre base de données Neon est active

### Le compte admin n'est pas créé
1. Créez d'abord un compte via l'interface d'inscription avec l'email `erwanguezingar01@gmail.com`
2. Exécutez ensuite `npm run make-admin`

### Le bouton "Administration" n'apparaît pas
1. Déconnectez-vous et reconnectez-vous
2. Vérifiez que votre compte a bien `isAdmin = true` dans la base de données
3. Videz le cache du navigateur

---

## 🎉 Prochaines étapes possibles

Si vous souhaitez étendre les fonctionnalités admin, vous pouvez ajouter :
- Promotion/rétrogradation d'autres utilisateurs en admin
- Statistiques détaillées par utilisateur
- Export de données
- Logs d'activité admin
- Gestion des limites par utilisateur (au lieu de globalement)

---

Bon travail avec votre nouveau tableau de bord admin ! 🚀
