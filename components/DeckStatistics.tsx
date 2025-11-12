'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DeckStats {
  totalCards: number;
  cardsByState: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };
  dueCards: number;
  totalReviews: number;
  averageDifficulty: number;
  masteredCards: number;
  difficultCards: number;
  reviewsToday: number;
  reviewsThisWeek: number;
  successRate: number;
  reviewHistory: { date: string; count: number }[];
}

interface DeckStatisticsProps {
  deckId: string;
}

const STATE_COLORS = {
  new: '#3b82f6',      // blue
  learning: '#f59e0b', // orange
  review: '#10b981',   // green
  relearning: '#ef4444', // red
};

const STATE_LABELS = {
  new: 'Nouvelles',
  learning: 'Apprentissage',
  review: 'Révision',
  relearning: 'Réapprentissage',
};

export default function DeckStatistics({ deckId }: DeckStatisticsProps) {
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Prepare data for pie chart
  const pieData = [
    { name: STATE_LABELS.new, value: stats.cardsByState.new, color: STATE_COLORS.new },
    { name: STATE_LABELS.learning, value: stats.cardsByState.learning, color: STATE_COLORS.learning },
    { name: STATE_LABELS.review, value: stats.cardsByState.review, color: STATE_COLORS.review },
    { name: STATE_LABELS.relearning, value: stats.cardsByState.relearning, color: STATE_COLORS.relearning },
  ].filter(item => item.value > 0);

  // Prepare data for bar chart with formatted dates
  const barData = stats.reviewHistory.map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    }),
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Total</div>
          <div className="text-2xl font-bold text-foreground">{stats.totalCards}</div>
          <div className="text-zinc-500 text-xs mt-1">cartes</div>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">À réviser</div>
          <div className="text-2xl font-bold text-blue-400">{stats.dueCards}</div>
          <div className="text-zinc-500 text-xs mt-1">cartes dues</div>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Maîtrisées</div>
          <div className="text-2xl font-bold text-green-400">{stats.masteredCards}</div>
          <div className="text-zinc-500 text-xs mt-1">stabilité &gt; 100</div>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-zinc-400 text-sm mb-1">Taux de réussite</div>
          <div className="text-2xl font-bold text-emerald-400">
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="text-zinc-500 text-xs mt-1">de bonnes réponses</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart - Card States */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Répartition des cartes
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
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
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-500">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Bar Chart - Review History */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Historique des révisions (7 jours)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="formattedDate"
                stroke="#71717a"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#71717a" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: '0.5rem',
                  color: '#fafafa',
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" name="Révisions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Details */}
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Détails de performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-zinc-400 text-sm mb-1">Révisions totales</div>
            <div className="text-xl font-bold text-foreground">{stats.totalReviews}</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Aujourd'hui</div>
            <div className="text-xl font-bold text-blue-400">{stats.reviewsToday}</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Cette semaine</div>
            <div className="text-xl font-bold text-indigo-400">{stats.reviewsThisWeek}</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Difficulté moyenne</div>
            <div className="text-xl font-bold text-orange-400">
              {stats.averageDifficulty.toFixed(1)}/10
            </div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Cartes difficiles</div>
            <div className="text-xl font-bold text-red-400">{stats.difficultCards}</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Progression</div>
            <div className="text-xl font-bold text-emerald-400">
              {stats.totalCards > 0
                ? ((stats.masteredCards / stats.totalCards) * 100).toFixed(0)
                : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
