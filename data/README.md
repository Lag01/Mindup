# Phrases de Motivation

Ce fichier contient les instructions pour personnaliser les messages de notification quotidiens.

## Fichier de configuration

Les phrases de motivation sont stockées dans `motivation-phrases.json`.

## Structure du fichier

```json
{
  "streakActive": [
    // Messages pour les utilisateurs avec un streak actif
  ],
  "noStreak": [
    // Messages pour les utilisateurs sans streak actif
  ]
}
```

## Comment personnaliser

### 1. Ajouter de nouvelles phrases

Ouvrez le fichier `motivation-phrases.json` et ajoutez vos phrases dans les tableaux correspondants.

#### Pour les utilisateurs avec streak actif

Utilisez les placeholders suivants :
- `{days}` : sera remplacé par le nombre de jours du streak
- `{s}` : sera remplacé par "s" si le streak est > 1 jour (pluriel)

Exemple :
```json
"🔥 Ton streak de {days} jour{s} est en danger ! Révise aujourd'hui pour le maintenir."
```

#### Pour les utilisateurs sans streak

Pas besoin de placeholders, écrivez simplement votre message :

Exemple :
```json
"💡 Un petit effort aujourd'hui = un grand progrès demain."
```

### 2. Exemples de phrases à ajouter

**Pour streak actif :**
- `"✨ {days} jour{s} d'excellence ! Continue sur ta lancée !"`
- `"🎯 Ne laisse pas tomber tes {days} jour{s} d'efforts !"`
- `"💎 {days} jour{s} de progression, c'est précieux !"`

**Sans streak :**
- `"🌟 Aujourd'hui est le jour parfait pour commencer !"`
- `"📈 Chaque session te rapproche de tes objectifs !"`
- `"⚡ 5 minutes peuvent faire toute la différence !"`

### 3. Bonnes pratiques

- **Variété** : Plus vous avez de phrases, plus les messages seront variés
- **Positivité** : Privilégiez les messages motivants plutôt que culpabilisants
- **Brièveté** : Les notifications ont une limite de caractères, restez concis
- **Emojis** : Utilisez des emojis pour rendre les messages plus engageants
- **Ton** : Gardez un ton cohérent avec votre audience

### 4. Format JSON

⚠️ **Attention au format JSON** :
- Chaque phrase doit être entre guillemets doubles `"`
- Séparez les phrases par une virgule `,`
- N'oubliez pas la virgule après chaque phrase sauf la dernière
- Échappez les apostrophes avec `\'` si nécessaire

Exemple complet :
```json
{
  "streakActive": [
    "🔥 Ton streak de {days} jour{s} est en danger !",
    "⚡ Ne perds pas ta série de {days} jour{s} !",
    "💪 Continue comme ça, déjà {days} jour{s} !"
  ],
  "noStreak": [
    "Je croyais que tu voulais t'améliorer ? 🤔",
    "💡 Un petit effort aujourd'hui = un grand progrès demain.",
    "🌱 Chaque révision te rapproche de tes objectifs."
  ]
}
```

### 5. Redémarrage après modification

Les phrases sont mises en cache pour des performances optimales. Après modification du fichier :

1. **En local** : Redémarrez le serveur de développement (`npm run dev`)
2. **En production** : Redéployez l'application sur Vercel

## Fonctionnement

- **Fréquence** : Une notification par jour à 18h
- **Condition** : Seulement si l'utilisateur n'a pas encore révisé aujourd'hui
- **Sélection** : Une phrase est choisie aléatoirement dans la catégorie appropriée
- **Personnalisation** : Les utilisateurs peuvent désactiver les alertes de streak ou les messages de motivation dans leurs paramètres
