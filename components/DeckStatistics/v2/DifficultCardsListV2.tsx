'use client';

import { useState } from 'react';
import Link from 'next/link';
import CardContentDisplay from '@/components/CardContentDisplay';
import { ProgressRing } from './ProgressRing';

interface DifficultCard {
  cardId: string;
  front: string;
  back: string;
  frontType: 'TEXT' | 'LATEX';
  backType: 'TEXT' | 'LATEX';
  frontImage: string | null;
  backImage: string | null;
  failureRate: number;
}

interface DifficultCardsListV2Props {
  cards: DifficultCard[];
  deckId: string;
}

function getFailureGradient(rate: number): string {
  if (rate <= 40) return 'from-green-500 to-yellow-500';
  if (rate <= 60) return 'from-yellow-500 to-orange-600';
  if (rate <= 80) return 'from-orange-500 to-red-600';
  return 'from-red-600 to-red-700';
}

function getSeverityLabel(rate: number): string {
  if (rate <= 40) return 'Attention légère';
  if (rate <= 60) return 'Révision nécessaire';
  if (rate <= 80) return 'Priorité haute';
  return 'Critique';
}

export function DifficultCardsListV2({ cards, deckId }: DifficultCardsListV2Props) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, cardId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCard(cardId);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-green-500/30 bg-gradient-to-br from-green-950/40 to-emerald-950/40 p-12 text-center backdrop-blur-xl">
        {/* Animated background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent_50%)]" />

        <div className="relative z-10">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="animate-bounce-slow">
              <span className="text-7xl drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">✨</span>
            </div>
          </div>
          <h3 className="mb-3 text-3xl font-black tracking-tight text-white">
            Excellent travail !
          </h3>
          <p className="text-lg text-green-200/80">
            Aucune carte difficile détectée
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-white">
              Cartes difficiles
            </h3>
            <p className="mt-1 font-mono text-sm text-zinc-400">
              <span className="font-bold text-orange-400">{cards.length}</span> carte
              {cards.length > 1 ? 's' : ''} nécessite{cards.length > 1 ? 'nt' : ''} attention
            </p>
          </div>

          {/* Global review button */}
          <Link
            href={`/deck/${deckId}/review`}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="relative flex items-center gap-2">
              <span>📚</span>
              <span>Tout réviser</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="space-y-4">
        {cards.map((card, index) => {
          const isExpanded = expandedCards.has(card.cardId);
          const gradient = getFailureGradient(card.failureRate);
          const severityLabel = getSeverityLabel(card.failureRate);

          return (
            <div
              key={card.cardId}
              className="group relative"
              style={{
                animation: `slideInUp 0.4s ease-out ${index * 0.08}s backwards`,
              }}
            >
              {/* Glow effect */}
              <div
                className={`absolute -inset-1 rounded-2xl bg-gradient-to-r ${gradient} opacity-0 blur-xl transition-all duration-500 group-hover:opacity-30`}
                aria-hidden="true"
              />

              {/* Main Card */}
              <div className="relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-900/90 backdrop-blur-xl transition-all duration-300 group-hover:border-zinc-600/70">
                {/* Corner accent - animated */}
                <div className="absolute left-0 top-0 h-3 w-3 rounded-br-lg bg-cyan-400/90 transition-all duration-300 group-hover:h-5 group-hover:w-5" />
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-tl-lg bg-cyan-400/90 transition-all duration-300 group-hover:h-5 group-hover:w-5" />

                {/* Severity bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${gradient} transition-all duration-300 group-hover:w-2`}
                  aria-hidden="true"
                />

                {/* Content Container */}
                <div className="relative p-6 pl-8">
                  {/* Header Row */}
                  <div className="mb-5 flex items-start gap-4">
                    {/* Index Badge */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-700 bg-zinc-800/80 shadow-inner transition-all group-hover:scale-110 group-hover:border-zinc-600 group-hover:shadow-lg">
                      <span className="text-xl font-black text-zinc-300">
                        {index + 1}
                      </span>
                    </div>

                    {/* Title and Controls */}
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <span className={`inline-block rounded-full bg-gradient-to-r ${gradient} px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg`}>
                          {severityLabel}
                        </span>
                        <button
                          onClick={() => toggleCard(card.cardId)}
                          onKeyDown={(e) => handleKeyDown(e, card.cardId)}
                          className="rounded-lg bg-zinc-800/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-300 transition-all hover:bg-zinc-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Réduire la carte' : 'Développer la carte'}
                        >
                          {isExpanded ? '▼ Réduire' : '▶ Développer'}
                        </button>
                      </div>
                    </div>

                    {/* Progress Ring */}
                    <div className="shrink-0 transition-transform duration-500 group-hover:scale-110">
                      <div className="animate-pulse-slow">
                        <ProgressRing
                          percentage={card.failureRate}
                          size="sm"
                          label="échec"
                          sublabel={`${card.failureRate}%`}
                          gradient={gradient}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div
                    className="overflow-hidden transition-all duration-500 ease-in-out"
                    style={{
                      maxHeight: isExpanded ? '500px' : '150px',
                      opacity: isExpanded ? 1 : 0.95,
                    }}
                  >
                    <div className="space-y-4">
                      {/* Front */}
                      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-4 backdrop-blur-sm transition-all hover:border-zinc-600/70">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-cyan-400" />
                          <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                            Recto
                          </p>
                        </div>
                        <CardContentDisplay
                          text={card.front}
                          textType={card.frontType}
                          imagePath={card.frontImage}
                          className="text-sm text-zinc-100"
                          maxHeight={isExpanded ? 200 : 80}
                        />
                      </div>

                      {/* Back - Only visible when expanded */}
                      {isExpanded && (
                        <div
                          className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-4 backdrop-blur-sm transition-all hover:border-zinc-600/70"
                          style={{
                            animation: 'fadeIn 0.5s ease-out',
                          }}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-pink-400" />
                            <p className="text-xs font-bold uppercase tracking-wider text-pink-400">
                              Verso
                            </p>
                          </div>
                          <CardContentDisplay
                            text={card.back}
                            textType={card.backType}
                            imagePath={card.backImage}
                            className="text-sm text-zinc-100"
                            maxHeight={200}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button - More prominent when expanded */}
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/deck/${deckId}/review`}
                      className={`group/btn relative overflow-hidden rounded-lg bg-gradient-to-r ${gradient} px-5 py-2.5 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl ${
                        isExpanded ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                      <span className="relative flex items-center gap-2 text-sm">
                        <span>📚</span>
                        <span>Réviser cette carte</span>
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Bottom gradient bar */}
                <div
                  className={`h-1 bg-gradient-to-r ${gradient} opacity-50 transition-all duration-300 group-hover:h-1.5 group-hover:opacity-80`}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Global Styles for Animations */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(0.98);
          }
        }

        :global(.animate-bounce-slow) {
          animation: bounce-slow 3s ease-in-out infinite;
        }

        :global(.animate-pulse-slow) {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
