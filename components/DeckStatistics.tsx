'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Hook pour détecter si on est sur mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

interface DeckStats {
  totalCards: number;

  cardsByStatus: {
    notStarted: number;
    inProgress: number;
    reviewed: number;
  };

  totalReviews: number;
  successRate: number;

  ratingDistribution: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };

  difficultCards: number;
  masteredCards: number;

  reviewsToday: number;
  reviewsThisWeek: number;

  reviewHistory: { date: string; count: number }[];
}

interface DeckStatisticsProps {
  deckId: string;
}

const PERFORMANCE_COLORS = {
  difficult: '#ef4444',   // red
  normal: '#3b82f6',      // blue
  mastered: '#10b981',    // green
};

export default function DeckStatistics({ deckId }: DeckStatisticsProps) {
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchStats();
  }, [deckId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/decks/${deckId}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <div className="text-zinc-400 text-center">Chargement des statistiques...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <div className="text-zinc-400 text-center">Statistiques non disponibles</div>
      </div>
    );
  }

  // Calculer les cartes normales
  const normalCards = stats.totalCards - (stats.difficultCards + stats.masteredCards + stats.cardsByStatus.notStarted);

  // Préparer les données pour le camembert de performance
  const pieData = [
    { name: 'Difficiles', value: stats.difficultCards, color: PERFORMANCE_COLORS.difficult },
    { name: 'Normales', value: normalCards, color: PERFORMANCE_COLORS.normal },
    { name: 'Maîtrisées', value: stats.masteredCards, color: PERFORMANCE_COLORS.mastered },
  ].filter(item => item.value > 0);

  // Préparer les données pour le graphique en ligne avec dates formatées
  const lineData = stats.reviewHistory.map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    }),
  }));

  return (
    <div className="space-y-6">
      {/* Cartes de métriques clés - 8 cartes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Carte 1 : Total */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Total</div>
          <div className="text-2xl font-bold text-foreground">{stats.totalCards}</div>
          <div className="text-zinc-500 text-xs mt-1">cartes</div>
        </div>

        {/* Carte 2 : Non commencées */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Non commencées</div>
          <div className="text-2xl font-bold text-gray-400">{stats.cardsByStatus.notStarted}</div>
          <div className="text-zinc-500 text-xs mt-1">jamais révisées</div>
        </div>

        {/* Carte 3 : En cours */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">En cours</div>
          <div className="text-2xl font-bold text-blue-400">{stats.cardsByStatus.inProgress}</div>
          <div className="text-zinc-500 text-xs mt-1">en apprentissage</div>
        </div>

        {/* Carte 4 : Maîtrisées */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Maîtrisées</div>
          <div className="text-2xl font-bold text-green-400">{stats.masteredCards}</div>
          <div className="text-zinc-500 text-xs mt-1">&gt;70% facile</div>
        </div>

        {/* Carte 5 : Difficiles */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Difficiles</div>
          <div className="text-2xl font-bold text-red-400">{stats.difficultCards}</div>
          <div className="text-zinc-500 text-xs mt-1">&gt;50% échecs</div>
        </div>

        {/* Carte 6 : Taux de réussite */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Taux de réussite</div>
          <div className="text-2xl font-bold text-emerald-400">
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="text-zinc-500 text-xs mt-1">good + easy</div>
        </div>

        {/* Carte 7 : Révisions totales */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Révisions totales</div>
          <div className="text-2xl font-bold text-purple-400">{stats.totalReviews}</div>
          <div className="text-zinc-500 text-xs mt-1">total</div>
        </div>

        {/* Carte 8 : Révisions aujourd'hui */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Aujourd'hui</div>
          <div className="text-2xl font-bold text-cyan-400">{stats.reviewsToday}</div>
          <div className="text-zinc-500 text-xs mt-1">révisions</div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camembert - Performance des cartes */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Performance des cartes
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy={isMobile ? "40%" : "50%"}
                  labelLine={false}
                  label={isMobile ? false : (entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={isMobile ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '0.5rem',
                    color: '#fafafa',
                  }}
                />
                {isMobile && (
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={`${isMobile ? 'h-[300px]' : 'h-[250px]'} flex items-center justify-center text-zinc-500`}>
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Graphique en ligne - Historique des révisions */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Historique des révisions (7 jours)
          </h3>
          <ResponsiveContainer width="100%" height={isMobile ? 350 : 250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="formattedDate"
                stroke="#71717a"
                style={{ fontSize: isMobile ? '10px' : '12px' }}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
                height={isMobile ? 60 : 30}
              />
              <YAxis stroke="#71717a" style={{ fontSize: isMobile ? '10px' : '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: '0.5rem',
                  color: '#fafafa',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Révisions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Détails des ratings */}
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Distribution des évaluations
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-zinc-400 text-sm mb-1">🔴 Échec</div>
            <div className="text-xl font-bold text-red-400">{stats.ratingDistribution.again}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {stats.totalReviews > 0
                ? ((stats.ratingDistribution.again / stats.totalReviews) * 100).toFixed(1)
                : 0}%
            </div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">🟠 Difficile</div>
            <div className="text-xl font-bold text-orange-400">{stats.ratingDistribution.hard}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {stats.totalReviews > 0
                ? ((stats.ratingDistribution.hard / stats.totalReviews) * 100).toFixed(1)
                : 0}%
            </div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">🟢 Bien</div>
            <div className="text-xl font-bold text-green-400">{stats.ratingDistribution.good}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {stats.totalReviews > 0
                ? ((stats.ratingDistribution.good / stats.totalReviews) * 100).toFixed(1)
                : 0}%
            </div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">🔵 Facile</div>
            <div className="text-xl font-bold text-blue-400">{stats.ratingDistribution.easy}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {stats.totalReviews > 0
                ? ((stats.ratingDistribution.easy / stats.totalReviews) * 100).toFixed(1)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Activité récente
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-zinc-400 text-sm mb-1">Cette semaine</div>
            <div className="text-xl font-bold text-indigo-400">{stats.reviewsThisWeek}</div>
            <div className="text-zinc-500 text-xs mt-1">révisions</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Progression</div>
            <div className="text-xl font-bold text-emerald-400">
              {stats.totalCards > 0
                ? ((stats.cardsByStatus.inProgress / stats.totalCards) * 100).toFixed(0)
                : 0}%
            </div>
            <div className="text-zinc-500 text-xs mt-1">cartes démarrées</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Maîtrise</div>
            <div className="text-xl font-bold text-green-400">
              {stats.totalCards > 0
                ? ((stats.masteredCards / stats.totalCards) * 100).toFixed(0)
                : 0}%
            </div>
            <div className="text-zinc-500 text-xs mt-1">cartes maîtrisées</div>
          </div>
        </div>
      </div>
    </div>
  );
}
