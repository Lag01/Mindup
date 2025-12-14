'use client';

import { memo } from 'react';
import { DeckCard } from './DeckCard';

interface Deck {
  id: string;
  name: string;
  totalCards: number;
  isImported?: boolean;
}

interface DeckListProps {
  decks: Deck[];
  onDelete: (deckId: string) => void;
  onRename: (deck: { id: string; name: string }) => void;
  onExport: (deckId: string, format: 'xml' | 'csv') => void;
  onResetStats: (deckId: string) => void;
  deletingDeckId: string | null;
  resettingStatsDeckId: string | null;
}

/**
 * Liste des decks affichés en grille
 * Utilise DeckCard pour chaque deck
 */
export const DeckList = memo(function DeckList({
  decks,
  onDelete,
  onRename,
  onExport,
  onResetStats,
  deletingDeckId,
  resettingStatsDeckId,
}: DeckListProps) {
  if (decks.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map(deck => (
        <DeckCard
          key={deck.id}
          deck={deck}
          onDelete={onDelete}
          onRename={onRename}
          onExport={onExport}
          onResetStats={onResetStats}
          deleting={deletingDeckId === deck.id}
          resettingStats={resettingStatsDeckId === deck.id}
        />
      ))}
    </div>
  );
});
