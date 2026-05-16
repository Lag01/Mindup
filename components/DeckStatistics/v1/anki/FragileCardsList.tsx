'use client';

import { useState } from 'react';
import CardContentDisplay from '@/components/CardContentDisplay';

interface FragileCard {
  cardId: string;
  front: string;
  back: string;
  frontType: 'TEXT' | 'LATEX';
  backType: 'TEXT' | 'LATEX';
  frontImage: string | null;
  backImage: string | null;
  stability: number;
  lapses: number;
}

interface FragileCardsListProps {
  cards: FragileCard[];
}

export default function FragileCardsList({ cards }: FragileCardsListProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="mx-auto mb-4 text-5xl">🧠</div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">Deck en bonne santé</h3>
        <p className="text-sm text-zinc-400">
          Aucune carte fragile détectée (stabilité {'<'} 7j ou ≥ 3 oublis)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Cartes fragiles</h3>
        <p className="mt-1 text-sm text-zinc-400">
          {cards.length} carte{cards.length > 1 ? 's' : ''} à faible stabilité mnésique ou fréquemment
          oubliée{cards.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-3">
        {cards.map((card, index) => {
          const isExpanded = expandedCards.has(card.cardId);
          const fragility = Math.min(100, Math.max(20, 100 - card.stability * 10));

          return (
            <div
              key={card.cardId}
              className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700"
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 transition-all duration-300 group-hover:w-1.5"
                style={{ opacity: fragility / 100 }}
              />

              <div className="flex gap-4 p-4 pl-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-bold text-zinc-400">
                  {index + 1}
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  <button
                    onClick={() => toggleCard(card.cardId)}
                    className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? '▼ Réduire' : '▶ Développer'}
                  </button>

                  <div>
                    <p className="text-xs font-semibold text-zinc-500 mb-1">Recto</p>
                    <CardContentDisplay
                      text={card.front}
                      textType={card.frontType}
                      imagePath={card.frontImage}
                      className="text-sm text-foreground"
                      maxHeight={isExpanded ? 200 : 80}
                    />
                  </div>

                  {isExpanded && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 mb-1">Verso</p>
                      <CardContentDisplay
                        text={card.back}
                        textType={card.backType}
                        imagePath={card.backImage}
                        className="text-sm text-foreground"
                        maxHeight={200}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-300">
                      Stabilité :{' '}
                      <span className="font-semibold text-red-400 tabular-nums">
                        {card.stability}j
                      </span>
                    </span>
                    <span className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-300">
                      Oublis :{' '}
                      <span className="font-semibold text-orange-400 tabular-nums">
                        {card.lapses}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
