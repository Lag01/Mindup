'use client'

interface QuickStatsProps {
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

      <div className="relative bg-zinc-800/50 backdrop-blur-sm rounded-lg p-2 border border-zinc-700/50 group-hover:border-zinc-600 transition-all min-h-[72px] flex items-center justify-center">
        {/* Icon + Value - Layout vertical compact */}
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-sm leading-none">{icon}</span>
          <span className={`text-lg font-bold tabular-nums bg-gradient-to-r ${gradient} bg-clip-text text-transparent leading-none mt-0.5`}>
            {value.toLocaleString('fr-FR')}
          </span>
          {/* Label */}
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold text-center leading-tight mt-0.5">
            {label}
          </div>
        </div>

        {/* Corner accent */}
        <div className="absolute top-2 left-2 w-1 h-1 bg-cyan-500/50 rounded-full" />
      </div>
    </div>
  )
}

export default function QuickStats({
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
      <div className="grid grid-cols-3 gap-2">
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
