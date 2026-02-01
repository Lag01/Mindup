'use client';

import Link from 'next/link';

interface DifficultCard {
  cardId: string;
  front: string;
  failureRate: number;
}

interface DifficultCardsListProps {
  cards: DifficultCard[];
  deckId: string;
}

export function DifficultCardsList({ cards, deckId }: DifficultCardsListProps) {
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-8 text-center backdrop-blur-sm">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <span className="text-3xl">✨</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Excellent travail !
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Aucune carte difficile détectée
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Cartes difficiles
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {cards.length} carte{cards.length > 1 ? 's' : ''} nécessite{cards.length > 1 ? 'nt' : ''} attention
          </p>
        </div>
        <Link
          href={`/deck/${deckId}/review?filter=difficult`}
          className="rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-orange-500 hover:to-red-500 hover:shadow-lg"
        >
          Réviser tout
        </Link>
      </div>

      <div className="space-y-3">
        {cards.map((card, index) => (
          <div
            key={card.cardId}
            className="group relative overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-900/50 transition-all duration-300 hover:border-zinc-600/70 hover:shadow-lg backdrop-blur-sm"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Severity Indicator */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-red-600 transition-all duration-300 group-hover:w-1.5"
              style={{
                opacity: card.failureRate / 100,
              }}
            />

            {/* Content */}
            <div className="flex items-center gap-4 p-4 pl-5">
              {/* Index Badge */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-bold text-zinc-400">
                {index + 1}
              </div>

              {/* Card Preview */}
              <div className="flex-1 space-y-2">
                <p className="line-clamp-2 text-sm text-foreground">
                  {card.front}
                </p>

                {/* Failure Rate Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500"
                        style={{ width: `${card.failureRate}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs font-semibold tabular-nums text-orange-400">
                    {card.failureRate}%
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={`/deck/${deckId}/review?cardId=${card.cardId}`}
                className="shrink-0 rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-700 hover:text-white"
              >
                Réviser
              </Link>
            </div>

            {/* Glow Effect */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-red-600/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
