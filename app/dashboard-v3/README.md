# Dashboard V3 - Documentation

## Vue d'ensemble

Dashboard V3 est une refonte graphique complète de l'interface Mindup avec une sidebar droite sur desktop, inspirée de Discord et Notion, tout en conservant l'esthétique cyber-futuriste et toutes les fonctionnalités existantes.

## Caractéristiques principales

### Design
- **Sidebar droite fixe** (320px) sur desktop (≥1024px)
- **Burger menu** avec overlay sur mobile (<768px)
- **Zone de contenu principale** adaptative
- **Esthétique cyber-futuriste** conservée (glow effects, scanlines, gradients, LED indicators)

### Composants

#### Sidebar Desktop (`components/Sidebar/`)
1. **UserProfile.tsx** - Profil utilisateur avec streak animé
2. **Navigation.tsx** - Navigation principale (5-6 liens)
3. **QuickStats.tsx** - 4 cartes statistiques rapides
4. **QuickActions.tsx** - Boutons Créer/Importer
5. **Sidebar.tsx** - Conteneur principal

#### Mobile (`components/MobileSidebar/`)
1. **MobileHeader.tsx** - Header avec burger + logo + streak
2. **MobileSidebar.tsx** - Overlay fullscreen

#### Main Content (`components/MainContent/`)
1. **SearchBar.tsx** - Barre de recherche avec debounce
2. **QuickFilters.tsx** - Filtres ALL/ANKI/À RÉVISER/IMPORTED
3. **DeckGrid.tsx** - Grille responsive des decks
4. **EnhancedDeckCard.tsx** - Carte de deck avec effets cyber
5. **EmptyState.tsx** - États vides (no-decks, no-results)

## Structure des fichiers

```
app/dashboard-v3/
├── page.tsx                          # Page principale
├── layout.tsx                        # Layout
├── README.md                         # Cette documentation
├── hooks/
│   └── useDeckFilters.ts            # Hook de filtrage
└── components/
    ├── Sidebar/
    │   ├── Sidebar.tsx
    │   ├── UserProfile.tsx
    │   ├── Navigation.tsx
    │   ├── QuickStats.tsx
    │   └── QuickActions.tsx
    ├── MobileSidebar/
    │   ├── MobileHeader.tsx
    │   └── MobileSidebar.tsx
    └── MainContent/
        ├── SearchBar.tsx
        ├── QuickFilters.tsx
        ├── DeckGrid.tsx
        ├── EnhancedDeckCard.tsx
        ├── EmptyState.tsx
        └── DropdownPortal.tsx
```

## Layout Responsive

### Desktop (≥1024px)
```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────┐  ┌───────────────┐  │
│  │     MAIN CONTENT (70%)         │  │  SIDEBAR (30%) │  │
│  │                                 │  │               │  │
│  │  • Recherche                   │  │ • Profil      │  │
│  │  • Filtres                     │  │ • Navigation  │  │
│  │  • Grille decks (2-3 col)      │  │ • Stats       │  │
│  │                                 │  │ • Actions     │  │
│  └─────────────────────────────────┘  └───────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────────────────┐
│  [≡] Logo    🔥3j [👤]  │  ← Header
├──────────────────────────┤
│  [Recherche............] │
├──────────────────────────┤
│  [ALL] [ANKI] [DUE]...  │
├──────────────────────────┤
│  ┌──────────────────┐   │
│  │   Deck Card      │   │  ← Grille 1 col
│  └──────────────────┘   │
└──────────────────────────┘
```

## Fonctionnalités

### Navigation
- **Mes Decks** - Liste personnelle (actif par défaut)
- **Decks Publics** - Bibliothèque publique
- **Classement** - Leaderboard
- **VeryFastMath** - Mode calcul mental
- **Administration** - Panel admin (si isAdmin)

### Statistiques Rapides
1. **Série** 🔥 - Streak actuel + max (hover pour record)
2. **Decks** 📚 - Nombre total de decks
3. **À réviser** ⚡ - Cartes dues aujourd'hui
4. **Révisées** 📈 - Total cartes révisées

### Actions Rapides
1. **Créer un deck** - Modal de création
2. **Importer un deck** - Redirection vers /import

### Recherche et Filtres
- **Recherche** - Debounce 300ms, clear button
- **Filtres** - ALL / ANKI / À RÉVISER / IMPORTED
- **Counts dynamiques** - Badges avec nombre d'éléments

## Palette de Couleurs

### Backgrounds
- Base: `from-zinc-950 via-zinc-900 to-zinc-950`
- Cards: `bg-zinc-900/50 backdrop-blur-md`
- Sidebar: `bg-zinc-900/95 backdrop-blur-xl`

### Accents
- Primary: `cyan-500` (navigation, focus)
- Success: `green-600` (créer, réviser)
- Warning: `orange-600 → red-600` (streak)
- Danger: `red-600` (supprimer, déconnexion)
- Info: `blue-600` (importer)
- Admin: `purple-500` (badge admin)

## Animations

### Keyframes
- `fadeIn` - Apparition douce (0.2s)
- `slideInRight` - Slide depuis la droite (0.3s)
- `slideDown` - Slide depuis le haut (0.3s)
- `pulse` - Pulsation (2s infinite)

### Effets Spéciaux
- **Glow Effects** - Shadow colorés au hover
- **Scanline** - Gradient vertical transparent
- **LED Indicators** - Dots pulsants (rouge si cartes dues)
- **Corner Accents** - Petits dots cyan dans les coins
- **Gradient Borders** - Borders animés

## Performance

### Optimisations
- **Lazy Loading** - Code splitting sur sidebar desktop
- **Memoization** - `useMemo` pour filteredDecks, `useCallback` pour handlers
- **Debouncing** - Recherche 300ms
- **Pagination** - 50 cartes/page conservée

### Métriques Cibles
- Lighthouse score > 90
- Chargement initial < 2s
- Animations 60fps
- Pas de lag scroll

## Accessibilité

- **Focus States** - `focus:ring-2 ring-cyan-500/50`
- **ARIA Labels** - Tous boutons et inputs
- **Keyboard Navigation** - Tab, Escape, Enter
- **Semantic HTML** - `<nav>`, `<aside>`, `<main>`, `<article>`
- **Screen Reader** - Labels explicites

## API Endpoints Utilisés

- `GET /api/decks` - Récupération decks avec stats
- `GET /api/stats/global` - Streak utilisateur
- `POST /api/decks` - Création deck
- `DELETE /api/decks?id={id}` - Suppression deck
- `POST /api/decks/{id}/reset-stats` - Réinitialisation stats
- `GET /api/decks/{id}/export?format=xml|csv` - Export deck
- `POST /api/auth/logout` - Déconnexion

## Migration depuis V2

La V3 est accessible via `/dashboard-v3` tandis que la V2 reste sur `/dashboard-v2`.

### Différences majeures
1. **Sidebar droite** vs header en haut
2. **Stats toujours visibles** vs cachées
3. **Navigation permanente** vs menu déroulant
4. **Grille 2 colonnes** sur desktop vs 3 colonnes

### Compatibilité
- ✅ Toutes les fonctionnalités V2 préservées
- ✅ Même API endpoints
- ✅ Même logique métier
- ✅ Composants réutilisés (DeckCard, Filters, etc.)

## Tests de Vérification

### Fonctionnels
- [ ] Navigation entre pages fonctionne
- [ ] Recherche avec debounce
- [ ] Filtres ALL/ANKI/DUE/IMPORTED
- [ ] Créer/Éditer/Supprimer deck
- [ ] Export XML/CSV
- [ ] Burger menu mobile
- [ ] Responsive desktop/tablet/mobile

### Performance
- [ ] Lighthouse score > 90
- [ ] Pas de lag scroll
- [ ] Animations 60fps
- [ ] Chargement < 2s

### Accessibilité
- [ ] Navigation clavier
- [ ] Focus visible
- [ ] Screen reader compatible
- [ ] Contraste WCAG AA

## Développement

### Lancer en dev
```bash
npm run dev
```
Puis accéder à `http://localhost:3000/dashboard-v3`

### Build production
```bash
npm run build
```

### Commandes utiles
```bash
# Linter
npm run lint

# Type checking
npx tsc --noEmit
```

## Support et Contribution

Cette version est conçue pour coexister avec la V2. Les utilisateurs peuvent tester la V3 sans impact sur leur workflow actuel.

Pour toute question ou amélioration, consulter le plan détaillé dans `PLAN_DASHBOARD_V3.md`.
