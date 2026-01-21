'use client';

import type { DeckWithStats } from '@/lib/types';
import EnhancedDeckCard from './EnhancedDeckCard';

interface DeckGridProps {
  decks: DeckWithStats[];
  onReview: (deckId: string) => void;
  onEdit: (deckId: string) => void;
  onStudy: (deckId: string) => void;
  onStats: (deckId: string) => void;
  onSettings: (deckId: string) => void;
  onResetStats: (deckId: string) => void;
  onQuickAdd: (deckId: string) => void;
  onRename: (deckId: string) => void;
  onExport: (deckId: string, format: 'xml' | 'csv') => void;
  onDelete: (deckId: string) => void;
}

export default function DeckGrid({
  decks,
  onReview,
  onEdit,
  onStudy,
  onStats,
  onSettings,
  onResetStats,
  onQuickAdd,
  onRename,
  onExport,
  onDelete,
}: DeckGridProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      role="list"
      aria-label="Liste des decks"
    >
      {decks.map((deck, index) => (
        <div
          key={deck.id}
          className="opacity-0 animate-[cascadeIn_0.5s_ease-out_forwards]"
          style={{
            animationDelay: `${index * 0.05}s`,
          }}
          role="listitem"
        >
          <EnhancedDeckCard
            deck={deck}
            onReview={onReview}
            onEdit={onEdit}
            onStudy={onStudy}
            onStats={onStats}
            onSettings={onSettings}
            onResetStats={onResetStats}
            onQuickAdd={onQuickAdd}
            onRename={onRename}
            onExport={onExport}
            onDelete={onDelete}
          />
        </div>
      ))}

      <style jsx global>{`
        @keyframes cascadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
