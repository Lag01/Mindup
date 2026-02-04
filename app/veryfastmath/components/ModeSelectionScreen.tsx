'use client';

import { useCountAnimation } from '@/hooks/useCountAnimation';

type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';

interface BestScores {
  ADDITION: number | null;
  SUBTRACTION: number | null;
  MULTIPLICATION: number | null;
  DIVISION: number | null;
}

interface ModeSelectionScreenProps {
  onSelectMode: (mode: MathMode) => void;
  bestScores: BestScores;
}

interface ModeConfig {
  mode: MathMode;
  label: string;
  emoji: string;
  accentColor: 'cyan' | 'green' | 'orange' | 'purple';
  borderGradient: string;
  glowColor: string;
  textColor: string;
  iconGlow: string;
}

interface MiniStatCardProps {
  icon: string;
  label: string;
  value: number | string;
  delay: number;
}

interface ModeCardProps {
  config: ModeConfig;
  bestScore: number | null;
  onSelect: () => void;
  delay: number;
}

function MiniStatCard({ icon, label, value, delay }: MiniStatCardProps) {
  const animatedValue = typeof value === 'number' ? useCountAnimation(value, 800) : value;

  return (
    <div
      className="bg-zinc-900/50 backdrop-blur-md rounded-lg p-4 border border-zinc-800/50"
      style={{ opacity: 0, animation: `fadeInUp 0.6s ease-out ${delay}s forwards` }}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
          <div className="text-xl font-bold text-cyan-400 font-mono">
            {typeof animatedValue === 'number' ? animatedValue.toLocaleString() : animatedValue}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({ config, bestScore, onSelect, delay }: ModeCardProps) {
  return (
    <article
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className="group relative bg-zinc-900/50 backdrop-blur-md rounded-lg p-8
        border border-transparent transition-all duration-300
        hover:scale-[1.02] hover:shadow-xl cursor-pointer"
      style={{
        opacity: 0,
        animation: `cascadeIn 0.6s ease-out ${delay}s forwards`,
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
      }}
      role="button"
      tabIndex={0}
      aria-label={`Sélectionner le mode ${config.label}`}
    >
      {/* Gradient Border */}
      <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${config.borderGradient} opacity-50 -z-10`}>
        <div className="absolute inset-[1px] bg-zinc-900/50 backdrop-blur-md rounded-lg" />
      </div>

      {/* Glow Effect */}
      <div className={`absolute inset-0 rounded-lg ${config.glowColor}
        opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl`} />

      {/* LED Indicator */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${config.textColor} opacity-40`} />
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${config.textColor} opacity-40 animate-ping`} />

      {/* Icône avec Glow */}
      <div className="mb-4 text-center">
        <span
          className="text-6xl md:text-7xl inline-block group-hover:scale-110 transition-transform duration-300"
          style={{ filter: config.iconGlow }}
        >
          {config.emoji}
        </span>
      </div>

      {/* Nom */}
      <h3 className={`text-2xl md:text-3xl font-bold text-center mb-4 ${config.textColor}`}>
        {config.label}
      </h3>

      {/* Badge Score ou Nouveau */}
      {bestScore !== null ? (
        <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
          <span className="text-yellow-400">🏆</span>
          <span>Meilleur score:</span>
          <span className={`font-bold font-mono ${config.textColor} text-lg`}>{bestScore}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs text-cyan-400">
            ⚡ Nouveau
          </span>
        </div>
      )}

      {/* Scanline */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-transparent to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />
    </article>
  );
}

export default function ModeSelectionScreen({
  onSelectMode,
  bestScores,
}: ModeSelectionScreenProps) {
  // Configuration des modes
  const modesConfig: ModeConfig[] = [
    {
      mode: 'ADDITION',
      label: 'Addition',
      emoji: '➕',
      accentColor: 'cyan',
      borderGradient: 'from-cyan-500/30 via-blue-500/30 to-cyan-500/30',
      glowColor: 'bg-cyan-500/5',
      textColor: 'text-cyan-400',
      iconGlow: 'drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]',
    },
    {
      mode: 'SUBTRACTION',
      label: 'Soustraction',
      emoji: '➖',
      accentColor: 'green',
      borderGradient: 'from-green-500/30 via-emerald-500/30 to-green-500/30',
      glowColor: 'bg-green-500/5',
      textColor: 'text-green-400',
      iconGlow: 'drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]',
    },
    {
      mode: 'MULTIPLICATION',
      label: 'Multiplication',
      emoji: '✖️',
      accentColor: 'orange',
      borderGradient: 'from-orange-500/30 via-red-500/30 to-orange-500/30',
      glowColor: 'bg-orange-500/5',
      textColor: 'text-orange-400',
      iconGlow: 'drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]',
    },
    {
      mode: 'DIVISION',
      label: 'Division',
      emoji: '➗',
      accentColor: 'purple',
      borderGradient: 'from-purple-500/30 via-violet-500/30 to-purple-500/30',
      glowColor: 'bg-purple-500/5',
      textColor: 'text-purple-400',
      iconGlow: 'drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]',
    },
  ];

  // Calcul du meilleur score global et du nombre de modes joués
  const bestGlobalScore = Math.max(...Object.values(bestScores).filter((s): s is number => s !== null), 0);
  const modesPlayed = Object.values(bestScores).filter((s) => s !== null).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          {/* Titre */}
          <h1
            className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400 bg-clip-text text-transparent"
            style={{ opacity: 0, animation: 'fadeInUp 0.6s ease-out 0s forwards' }}
          >
            Défis VeryFastMath
          </h1>

          {/* Sous-titre */}
          <p
            className="text-lg md:text-xl text-zinc-400 mb-4"
            style={{ opacity: 0, animation: 'fadeInUp 0.6s ease-out 0.1s forwards' }}
          >
            Vous avez <span className="text-cyan-400 font-mono font-bold">60 secondes</span> pour résoudre un maximum d'opérations !
          </p>

          {/* Badge Mode Sprint */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-cyan-500/30 rounded-full text-sm text-cyan-400"
            style={{ opacity: 0, animation: 'fadeInUp 0.6s ease-out 0.2s forwards' }}
          >
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
            <span>Mode Sprint</span>
          </div>
        </div>

        {/* Mini Stats Grid (conditionnel) */}
        {bestGlobalScore > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <MiniStatCard
              icon="🏆"
              label="Meilleur Score"
              value={bestGlobalScore}
              delay={0.3}
            />
            <MiniStatCard
              icon="🎯"
              label="Modes Joués"
              value={modesPlayed}
              delay={0.35}
            />
            <MiniStatCard
              icon="⏱️"
              label="Durée Sprint"
              value="60s"
              delay={0.4}
            />
          </div>
        )}

        {/* Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {modesConfig.map((config, index) => (
            <ModeCard
              key={config.mode}
              config={config}
              bestScore={bestScores[config.mode]}
              onSelect={() => onSelectMode(config.mode)}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Terminal Footer */}
        <div
          className="flex items-center gap-2 text-xs font-mono text-zinc-500"
          style={{ opacity: 0, animation: 'fadeInUp 0.6s ease-out 0.6s forwards' }}
        >
          <span>$ select_mode --difficulty=hardcore --timer=60</span>
          <span className="inline-block w-2 h-3 bg-cyan-500/60 animate-blink" />
        </div>
      </div>

      {/* Animations CSS */}
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

        @keyframes cascadeIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
