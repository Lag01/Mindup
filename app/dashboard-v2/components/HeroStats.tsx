'use client';

import { useCountAnimation } from '../hooks/useCountAnimation';

interface HeroStatsProps {
  currentStreak: number;
  maxStreak: number;
  totalDecks: number;
  cardsToReview: number;
  totalCardsReviewed: number;
}

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  unit?: string;
  accentColor: 'orange' | 'cyan' | 'green' | 'red' | 'purple';
  delay: number;
  pulse?: boolean;
  highlight?: boolean;
}

function StatCard({ icon, label, value, unit, accentColor, delay, pulse, highlight }: StatCardProps) {
  const animatedValue = useCountAnimation(value, 800);

  const accentStyles = {
    orange: {
      border: 'from-orange-500/30 via-red-500/30 to-orange-500/30',
      glow: 'group-hover:shadow-orange-500/20',
      text: 'text-orange-400',
      iconGlow: 'drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]',
    },
    cyan: {
      border: 'from-cyan-500/30 via-blue-500/30 to-cyan-500/30',
      glow: 'group-hover:shadow-cyan-500/20',
      text: 'text-cyan-400',
      iconGlow: 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]',
    },
    green: {
      border: 'from-green-500/30 via-emerald-500/30 to-green-500/30',
      glow: 'group-hover:shadow-green-500/20',
      text: 'text-green-400',
      iconGlow: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    },
    red: {
      border: 'from-red-500/30 via-rose-500/30 to-red-500/30',
      glow: 'group-hover:shadow-red-500/20',
      text: 'text-red-400',
      iconGlow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    },
    purple: {
      border: 'from-purple-500/30 via-violet-500/30 to-purple-500/30',
      glow: 'group-hover:shadow-purple-500/20',
      text: 'text-purple-400',
      iconGlow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]',
    },
  };

  const style = accentStyles[accentColor];

  return (
    <article
      className={`group relative bg-zinc-900/50 backdrop-blur-md rounded-lg p-6 border border-transparent transition-all duration-300 hover:scale-[1.02] ${style.glow}`}
      style={{
        opacity: 0,
        animation: `fadeInUp 0.6s ease-out ${delay}s forwards`,
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
      }}
    >
      {/* Gradient Border */}
      <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${style.border} opacity-50 -z-10`} style={{ padding: '1px' }}>
        <div className="absolute inset-[1px] bg-zinc-900/50 backdrop-blur-md rounded-lg" />
      </div>

      {/* Corner Accent - Technical Detail */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${style.text} opacity-40`} />
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${style.text} opacity-40 animate-ping`} />

      {/* Icon */}
      <div className="mb-3">
        <span
          className={`text-4xl ${pulse ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`}
          style={{ filter: style.iconGlow }}
        >
          {icon}
        </span>
      </div>

      {/* Label */}
      <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2 font-medium">
        {label}
      </div>

      {/* Value */}
      <div className={`text-4xl font-bold ${style.text} mb-1 tabular-nums`}>
        {animatedValue.toLocaleString()}
        {unit && <span className="text-2xl ml-1 opacity-70">{unit}</span>}
      </div>

      {/* Highlight Badge pour cartes à réviser */}
      {highlight && value > 0 && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 animate-[pulse_2s_ease-in-out_infinite]">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          <span>Action requise</span>
        </div>
      )}

      {/* Scanline effect - subtle tech detail */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />
    </article>
  );
}

export default function HeroStats({
  currentStreak,
  maxStreak,
  totalDecks,
  cardsToReview,
  totalCardsReviewed,
}: HeroStatsProps) {
  return (
    <section className="mb-8" aria-label="Statistiques principales">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Streak Card */}
        <StatCard
          icon="🔥"
          label="Série Actuelle"
          value={currentStreak}
          unit="j"
          accentColor="orange"
          delay={0}
          pulse={currentStreak > 0}
        />

        {/* Total Decks */}
        <StatCard
          icon="📚"
          label="Decks Créés"
          value={totalDecks}
          accentColor="cyan"
          delay={0.1}
        />

        {/* Cards to Review - Highlighted if > 0 */}
        <StatCard
          icon="⚡"
          label="À Réviser"
          value={cardsToReview}
          accentColor={cardsToReview > 0 ? 'red' : 'green'}
          delay={0.2}
          highlight={true}
        />

        {/* Total Cards Reviewed */}
        <StatCard
          icon="📈"
          label="Cartes Révisées"
          value={totalCardsReviewed}
          accentColor="purple"
          delay={0.3}
        />
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
