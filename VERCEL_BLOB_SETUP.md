# Configuration Vercel Blob Storage

## 📋 Prérequis

L'application utilise **Vercel Blob Storage** pour stocker les images des cartes. Cette fonctionnalité est **réservée aux administrateurs** uniquement.

## 🔧 Configuration sur Vercel

### 1. Activer Vercel Blob Storage

1. Va sur ton projet Vercel : https://vercel.com/dashboard
2. Sélectionne ton projet (`mindupscale`)
3. Va dans l'onglet **Storage**
4. Clique sur **Create Database**
5. Sélectionne **Blob**
6. Donne un nom à ton Blob store (ex: `mindup-images`)
7. Clique sur **Create**

### 2. Connecter le Blob store à ton projet

1. Une fois créé, clique sur le Blob store
2. Va dans l'onglet **Connect**
3. Sélectionne ton projet dans la liste
4. Clique sur **Connect**

Vercel ajoutera automatiquement la variable d'environnement `BLOB_READ_WRITE_TOKEN` à ton projet.

### 3. Redéployer

Vercel redéploiera automatiquement ton application avec les nouvelles variables d'environnement.

## ✅ Vérification

Une fois configuré :
- Les administrateurs pourront uploader des images dans les formulaires de cartes
- Les images seront stockées sur Vercel Blob Storage
- Les URLs seront au format : `https://xxxxx.public.blob.vercel-storage.com/cards/...`
- Les utilisateurs non-admin verront une erreur 403 s'ils tentent d'uploader

## 📝 Notes

- **Quota gratuit** : 500 MB de stockage et 1000 requêtes/mois
- Les anciennes images locales (dans `public/uploads/cards`) continueront de fonctionner
- La suppression d'images fonctionne aussi bien pour les images Blob que locales

## 🔐 Sécurité

- Seuls les administrateurs peuvent uploader et supprimer des images
- Les images sont publiquement accessibles via leur URL
- Les URLs sont générées avec des identifiants uniques pour éviter les collisions
