'use client';

import { useState, useRef, useEffect, memo } from 'react';
import type { DeckWithStats } from '@/lib/types';
import { toDashboardGroups } from '@/lib/cardCategories';
import DropdownPortal from './DropdownPortal';
import { useIsMobile } from '@/hooks/useIsMobile';

interface EnhancedDeckCardProps {
  deck: DeckWithStats;
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

const EnhancedDeckCard = memo(function EnhancedDeckCard({
  deck,
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
}: EnhancedDeckCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const isAnki = deck.learningMethod === 'ANKI';
  const dueCount = deck.ankiStats?.due || 0;
  const hasDueCards = isAnki && dueCount > 0;


  // Barre de progression compacte : 3 groupes (Nouvelles · En cours · Maîtrisées).
  // « En cours » = apprentissage + réapprentissage + jeunes ; « Maîtrisées » = matures.
  const getProgressSegments = () => {
    if (!isAnki || !deck.ankiStats) return null;

    const groups = toDashboardGroups(deck.ankiStats);
    const total = groups.new.count + groups.inProgress.count + groups.mature.count;

    if (total === 0) return null;

    return {
      groups,
      total,
      new: (groups.new.count / total) * 100,
      inProgress: (groups.inProgress.count / total) * 100,
      mature: (groups.mature.count / total) * 100,
    };
  };

  const segments = getProgressSegments();

  return (
    <article
      className="group relative bg-zinc-900 rounded-xl p-5 border border-zinc-800 transition-colors duration-200 hover:border-zinc-700"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Row: Badges + Menu */}
      <div className="flex items-start justify-between mb-3">
        {/* Badges */}
        <div className="flex gap-2">
          {isAnki && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-xs font-medium text-purple-400 uppercase tracking-wider"
             
            >
              <span className="text-purple-400">◈</span>
              Anki
            </span>
          )}

          {deck.isImported && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs font-medium text-blue-400 uppercase tracking-wider"
             
            >
              <span className="text-blue-400">↓</span>
              Imported
            </span>
          )}
        </div>

        {/* Dropdown Menu */}
        <div className="relative">
          <button
            ref={menuButtonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-3 md:p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Menu d'actions du deck"
            aria-expanded={isMenuOpen}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          <DropdownPortal
            buttonRef={menuButtonRef}
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            align="right"
          >
            <div className="w-56 bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-xl shadow-black/50 overflow-hidden animate-[slideDown_0.2s_ease-out]">
              <button
                onClick={() => { onStudy(deck.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
              >
                <span className="text-zinc-400">▶</span>
                Étudier
              </button>

              <button
                onClick={() => { onStats(deck.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
              >
                <span className="text-zinc-400">📊</span>
                Statistiques
              </button>

              <button
                onClick={() => { onSettings(deck.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
              >
                <span className="text-zinc-400">⚙</span>
                Paramètres
              </button>

              <button
                onClick={() => { onResetStats(deck.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
              >
                <span className="text-zinc-400">↺</span>
                Réinitialiser stats
              </button>

              <div className="h-px bg-zinc-700/50 my-1" />

              {!deck.isImported && (
                <>
                  <button
                    onClick={() => { onQuickAdd(deck.id); setIsMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
                  >
                    <span className="text-zinc-400">+</span>
                    Ajout rapide
                  </button>

                  <button
                    onClick={() => { onRename(deck.id); setIsMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
                  >
                    <span className="text-zinc-400">✎</span>
                    Renommer
                  </button>
                </>
              )}

              <button
                onClick={() => { onExport(deck.id, 'xml'); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
              >
                <span className="text-zinc-400">⇩</span>
                Export XML
              </button>

              <button
                onClick={() => { onExport(deck.id, 'csv'); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
              >
                <span className="text-zinc-400">⇩</span>
                Export CSV
              </button>

              <div className="h-px bg-zinc-700/50 my-1" />

              <button
                onClick={() => { onDelete(deck.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
              >
                <span className="text-red-400">✕</span>
                Supprimer
              </button>
            </div>
          </DropdownPortal>
        </div>
      </div>

      {/* Deck Name */}
      <h3
        className="text-xl font-bold text-zinc-100 mb-4 leading-tight"
       
      >
        {deck.name}
      </h3>

      {/* Progress Bar (Anki only) */}
      {isAnki && segments && deck.ankiStats && (
        <div className="mb-4">
          {/* Progress Bar Container */}
          <div className="h-2 bg-zinc-800/50 rounded-full overflow-hidden mb-2">
            <div className="flex h-full">
              {/* Nouvelles */}
              {segments.new > 0 && (
                <div
                  className="transition-all duration-800 ease-out animate-[fillProgress_0.8s_ease-out]"
                  style={{ width: `${segments.new}%`, backgroundColor: segments.groups.new.hex }}
                  title={`${segments.groups.new.count} nouvelles cartes`}
                />
              )}

              {/* En cours (apprentissage + réapprentissage + jeunes) */}
              {segments.inProgress > 0 && (
                <div
                  className="transition-all duration-800 ease-out animate-[fillProgress_0.8s_ease-out_0.1s]"
                  style={{ width: `${segments.inProgress}%`, backgroundColor: segments.groups.inProgress.hex }}
                  title={`${segments.groups.inProgress.count} cartes en cours d'apprentissage`}
                />
              )}

              {/* Maîtrisées (matures) */}
              {segments.mature > 0 && (
                <div
                  className="transition-all duration-800 ease-out animate-[fillProgress_0.8s_ease-out_0.2s]"
                  style={{ width: `${segments.mature}%`, backgroundColor: segments.groups.mature.hex }}
                  title={`${segments.groups.mature.count} cartes maîtrisées (matures)`}
                />
              )}
            </div>
          </div>

          {/* Progress Labels */}
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: segments.groups.new.hex }} />
              {segments.groups.new.count} Nouvelles
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: segments.groups.inProgress.hex }} />
              {segments.groups.inProgress.count} En cours
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: segments.groups.mature.hex }} />
              {segments.groups.mature.count} Maîtrisées
            </span>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-3 text-sm text-zinc-400 mb-4">
        <span>{deck.totalCards} carte{deck.totalCards !== 1 ? 's' : ''}</span>

        {hasDueCards && (
          <>
            <span className="text-zinc-600">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-red-400 font-semibold">{dueCount} à réviser</span>
              <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
            </span>
          </>
        )}
      </div>

      {/* Quick Actions (revealed on hover or always visible on mobile) */}
      <div
        className={`flex gap-2 transition-all duration-200 ${
          isMobile || isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Review Button */}
        <button
          onClick={() => onReview(deck.id)}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-label="Réviser les cartes"
        >
          Réviser
        </button>

        {/* Edit Button (hidden if imported) */}
        {!deck.isImported && (
          <button
            onClick={() => onEdit(deck.id)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            aria-label="Éditer le deck"
          >
            ✎ Éditer
          </button>
        )}

      </div>

      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fillProgress {
          from {
            width: 0;
          }
        }
      `}</style>
    </article>
  );
});

export default EnhancedDeckCard;
