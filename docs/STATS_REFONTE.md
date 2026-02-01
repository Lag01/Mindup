# Refonte des Pages de Statistiques des Decks

## Vue d'ensemble

Cette refonte transforme les statistiques d'un dashboard informatif en un outil motivant et actionnable avec :
- ✅ **Clarté** : Hiérarchie visuelle claire, élimination de la redondance
- ✅ **Insights actionnables** : Recommandations intelligentes basées sur les stats
- ✅ **Métriques utiles** : Temps/efficacité, prédictions, tendances, top cartes difficiles
- ✅ **Design moderne** : Style dashboard-v3 avec gradients et animations
- ✅ **Mobile optimisé** : Navigation par tabs au lieu de scroll infini

## Architecture

### Structure des Composants

```
components/DeckStatistics/v2/
├── EnhancedStatCard.tsx        # Carte stat avec gradient + sparkline
├── ProgressRing.tsx            # Graphique circulaire SVG animé
├── InsightCard.tsx             # 4 variants d'insights
├── PeriodSelector.tsx          # Sélecteur période (7j, 30j, 3m, all)
├── TrendChart.tsx              # LineChart avec comparaison période
├── DifficultCardsList.tsx      # Top 5 cartes difficiles
├── DistributionTabs.tsx        # Tabs distribution ratings/types
├── StatsHeroSection.tsx        # Hero : ProgressRing + 4 StatCards
├── InsightsSection.tsx         # Container insights automatiques
└── index.ts                    # Exports
```

### Utilitaires

```
lib/
├── insights-generator.ts       # Génération automatique de 11 types d'insights
├── stats-calculations.ts       # Fonctions calcul (trend, sparkline, prédictions)
├── chart-config.ts             # Configurations Recharts réutilisables
└── utils.ts                    # Fonction cn pour Tailwind
```

## Nouvelles Métriques API

### Endpoint : `/api/decks/[id]/stats`

**Métriques enrichies ajoutées :**

```typescript
interface ExtendedDeckStats {
  // ... métriques existantes

  // Temps et efficacité
  avgTimePerCard: number;          // Temps moyen par carte (secondes)
  totalStudyTime: number;          // Temps total d'étude (minutes)

  // Tendances
  reviewsVsYesterday: number;      // +15, -5
  reviewsVsPreviousWeek: number;   // +15, -5
  successRateChange: number;       // +12, -3

  // Prédictions
  estimatedCompletionDays: number; // Jours estimés pour maîtriser
  projectedMasteryRate: number;    // % dans 30 jours

  // Top/Bottom
  topDifficultCards: Array<{
    cardId: string;
    front: string;
    failureRate: number;
  }>;

  recentlyMastered: Array<{
    cardId: string;
    front: string;
    masteredAt: string;
  }>;
}
```

### Requêtes SQL Optimisées

1. **Temps moyen par carte** : Calcul via `LEAD()` window function sur ReviewEvents
2. **Top 5 cartes difficiles** : Tri par `failureRate DESC` avec min 3 reps
3. **Comparaison périodes** : Agrégation avec `CASE WHEN` pour différentes plages
4. **Prédictions** : Calcul moyenne cartes maîtrisées sur 30 derniers jours

## Insights Automatiques

### Générateur d'Insights

**11 types d'insights triés par priorité (1-5) :**

| Type | Titre | Condition | Priorité |
|------|-------|-----------|----------|
| Warning | Cartes difficiles | ≥3 topDifficultCards | 5 |
| Warning | Streak en danger | 0 révisions après 18h | 5 |
| Milestone | Nouveau record | reviewsToday > hier +50% | 4 |
| Positive | Progression excellente | successRateChange ≥ +10% | 4 |
| Positive | Presque terminé | 80% ≤ masteryPercentage < 100% | 4 |
| Milestone | Deck maîtrisé | masteryPercentage = 100% | 5 |
| Suggestion | Moment optimal | 9h-11h, 0 révisions | 2 |
| Positive | Régularité excellente | 0% ≤ reviewsVsPreviousWeek ≤ 20% | 3 |
| Warning | Activité en baisse | reviewsVsPreviousWeek < -30% | 3 |
| Suggestion | Objectif proche | 0 < estimatedCompletionDays ≤ 30 | 2 |
| Positive | Performance excellente | successRate ≥ 80%, totalReviews ≥ 20 | 3 |

**Retour :** Top 5 insights triés par priorité décroissante

## Design System

### Esthétique "Data Glimmer"

**Concept :** Cartes de données qui respirent et réagissent, avec des éléments de lumière subtile et une typographie marquante.

**Typographie :**
- JetBrains Mono : Chiffres (monospace technique raffiné)
- Sans-serif géométrique : Labels

**Palette de Couleurs :**
```css
/* Fond */
--bg-primary: zinc-900
--bg-secondary: zinc-800
--border: zinc-700/50

/* Gradients */
--gradient-cyan-blue: from-cyan-500 to-blue-600    /* Général */
--gradient-green: from-green-500 to-emerald-600    /* Succès */
--gradient-orange-red: from-orange-500 to-red-600  /* Warning */
--gradient-yellow: from-yellow-500 to-orange-600   /* Streak */
```

### Animations

**Au Chargement (Stagger) :**
```css
@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.stat-card { animation: slideUpFade 0.5s ease-out; }
.stat-card:nth-child(n) { animation-delay: calc(n * 75ms); }
```

**Hover Effects :**
- Glow effect : opacity 0 → 0.3
- Scale : 1 → 1.05 (ProgressRing)
- Border : zinc-700/50 → zinc-600/70

**ProgressRing Animation :**
- SVG circle dasharray animé de 0 → percentage en 1s
- Scale-in avec cubic-bezier bounce

## Responsive Mobile

### Layout avec Tabs

**3 Tabs :**
1. **Vue** : StatsHeroSection + InsightsSection (top 3)
2. **Tendances** : TrendChart + DifficultCardsList
3. **Détails** : DistributionTabs + Stats ANKI

**Optimisations :**
- Touch targets min 44x44px
- Labels graphiques verticaux
- Tooltips custom lisibles
- Sparklines simplifiés
- Grid 2x2 au lieu de 2x4
- ProgressRing taille md (120px) au lieu de lg (200px)

## Performances

### Bundle Optimization

**Lazy Loading :**
```typescript
const DeckStatistics = dynamic(() => import('@/components/DeckStatistics'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

**Recharts Tree-Shaking :**
- Import seulement composants nécessaires (LineChart, BarChart)
- Configurations externalisées dans `chart-config.ts`

### SQL Performance

**Requêtes optimisées :**
- Agrégation SQL au lieu de boucles forEach
- Index sur `lastReview`, `cardId`, `userId`
- EXPLAIN ANALYZE vérifié sur decks 500+ cartes

## Accessibilité

### WCAG 2.1 AA

**Features :**
- Focus visible : 2px solid cyan outline
- Reduced motion support : `@media (prefers-reduced-motion: reduce)`
- Touch targets : min 44x44px sur mobile
- Aria labels sur graphiques SVG
- Contraste couleurs : ratio ≥ 4.5:1

## Tests

### Tests Unitaires

**Couverture :**
- `insights-generator.test.ts` : 6 tests
- `stats-calculations.test.ts` : 17 tests

**Lancer les tests :**
```bash
npm run test
```

### Tests Manuels

**Scénarios :**
1. Deck actif (500+ cartes, 5000+ reviews)
2. Deck nouveau (0 révisions)
3. Mobile (<768px) - 3 tabs
4. Reduced motion activé

## Migration

### Avant/Après

**Métriques supprimées (redondance) :**
- ❌ Total → Déplacé dans ProgressRing
- ❌ Non commencées → Calculable
- ❌ Révisions totales → Remplacé par contexte temporel

**Nouveaux composants :**
- ✅ 9 composants v2 dans `components/DeckStatistics/v2/`
- ✅ 3 utilitaires dans `lib/`

**Composants dépréciés (à supprimer) :**
- `MetricsCard.tsx`
- `PerformanceChart.tsx`
- `ReviewHistoryChart.tsx`

## Troubleshooting

### Erreurs Communes

**1. Module not found: @/components/ui/tabs**
```bash
npm install @radix-ui/react-tabs tailwind-merge
```

**2. Animations ne fonctionnent pas**
- Vérifier `app/globals.css` contient les keyframes
- Vérifier classes `.stat-card`, `.insight-card`, `.progress-ring`

**3. Build Turbopack fail**
- Vérifier `lib/utils.ts` existe avec fonction `cn`
- Vérifier imports absolus avec `@/`

## Roadmap Future

### V2.1 (Optimisations)
- [ ] Ajout streak utilisateur à l'API
- [ ] Cache React Query pour stats
- [ ] Export PDF des statistiques

### V2.2 (Features)
- [ ] Graphiques comparaison multi-decks
- [ ] Insights personnalisés par utilisateur
- [ ] Notifications push pour insights warnings

### V2.3 (Analytics)
- [ ] Tracking événements (Vercel Analytics)
- [ ] A/B testing variants insights
- [ ] Heatmap interactions utilisateurs

## Contributeurs

- Refonte design & développement : Claude Sonnet 4.5
- Architecture API : Optimisations SQL
- Tests : Jest + Testing Library

## License

Projet interne - Tous droits réservés
