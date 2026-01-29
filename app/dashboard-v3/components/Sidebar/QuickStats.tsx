'use client'

interface QuickStatsProps {
  currentStreak: number
  maxStreak: number
  totalDecks: number
  dueCards: number
  reviewedCards: number
}

interface StatCardProps {
  label: string
  value: number
  icon: string
  gradient: string
}

function StatCard({ label, value, icon, gradient }: StatCardProps) {
  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className={`absolute inset-0 ${gradient} rounded-lg blur-sm opacity-0 group-hover:opacity-30 transition-opacity`} />

      <div className="relative bg-zinc-800/50 backdrop-blur-sm rounded-lg p-3 border border-zinc-700/50 group-hover:border-zinc-600 transition-all">
        {/* Icon + Value */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg">{icon}</span>
          <span className={`text-2xl font-bold tabular-nums bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {value.toLocaleString('fr-FR')}
          </span>
        </div>

        {/* Label */}
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
          {label}
        </div>

        {/* Corner accent */}
        <div className="absolute top-2 left-2 w-1 h-1 bg-cyan-500/50 rounded-full" />
      </div>
    </div>
  )
}

export default function QuickStats({
  currentStreak,
  maxStreak,
  totalDecks,
  dueCards,
  reviewedCards,
}: QuickStatsProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <h3 className="text-xs text-zinc-500 uppercase tracking-wider font-bold px-2">
        Statistiques Rapides
      </h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Série"
          value={currentStreak}
          icon="🔥"
          gradient="from-orange-500 to-red-600"
        />

        <StatCard
          label="Decks"
          value={totalDecks}
          icon="📚"
          gradient="from-cyan-500 to-blue-600"
        />

        <StatCard
          label="À réviser"
          value={dueCards}
          icon="⚡"
          gradient="from-yellow-500 to-orange-600"
        />

        <StatCard
          label="Révisées"
          value={reviewedCards}
          icon="📈"
          gradient="from-green-500 to-emerald-600"
        />
      </div>
    </div>
  )
}
