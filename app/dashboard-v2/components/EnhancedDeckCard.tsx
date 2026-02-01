'use client';

import { useState, useRef, useEffect } from 'react';
import type { DeckWithStats } from '@/lib/types';
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

export default function EnhancedDeckCard({
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
  // Bouton disabled SEULEMENT pour Anki avec 0 cartes dues
  // Pour IMMEDIATE : toujours enabled
  const canReview = deck.learningMethod === 'IMMEDIATE' || (isAnki && dueCount > 0);


  // Calculate progress bar segments
  const getProgressSegments = () => {
    if (!isAnki || !deck.ankiStats) return null;

    const { new: newCards, learning, review } = deck.ankiStats;
    const total = newCards + learning + review;

    if (total === 0) return null;

    return {
      new: (newCards / total) * 100,
      learning: (learning / total) * 100,
      review: (review / total) * 100,
    };
  };

  const segments = getProgressSegments();

  return (
    <article
      className="group relative bg-zinc-900/50 backdrop-blur-md rounded-lg p-5 border border-zinc-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
      }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-lg bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />

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
            className="p-3 md:p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <span className="text-cyan-400">▶</span>
                Étudier
              </button>

              <button
                onClick={() => { onStats(deck.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <span className="text-cyan-400">📊</span>
                Statistiques
              </button>

              <button
                onClick={() => { onSettings(deck.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <span className="text-cyan-400">⚙</span>
                Paramètres
              </button>

              <button
                onClick={() => { onResetStats(deck.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <span className="text-cyan-400">↺</span>
                Réinitialiser stats
              </button>

              <div className="h-px bg-zinc-700/50 my-1" />

              {!deck.isImported && (
                <>
                  <button
                    onClick={() => { onQuickAdd(deck.id); setIsMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center gap-2"
                  >
                    <span className="text-cyan-400">+</span>
                    Ajout rapide
                  </button>

                  <button
                    onClick={() => { onRename(deck.id); setIsMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center gap-2"
                  >
                    <span className="text-cyan-400">✎</span>
                    Renommer
                  </button>
                </>
              )}

              <button
                onClick={() => { onExport(deck.id, 'xml'); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <span className="text-cyan-400">⇩</span>
                Export XML
              </button>

              <button
                onClick={() => { onExport(deck.id, 'csv'); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <span className="text-cyan-400">⇩</span>
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
              {/* New segment */}
              {segments.new > 0 && (
                <div
                  className="bg-orange-500 transition-all duration-800 ease-out animate-[fillProgress_0.8s_ease-out]"
                  style={{ width: `${segments.new}%` }}
                  title={`${deck.ankiStats.new} nouvelles cartes`}
                />
              )}

              {/* Learning segment */}
              {segments.learning > 0 && (
                <div
                  className="bg-yellow-500 transition-all duration-800 ease-out animate-[fillProgress_0.8s_ease-out_0.1s]"
                  style={{ width: `${segments.learning}%` }}
                  title={`${deck.ankiStats.learning} cartes en apprentissage`}
                />
              )}

              {/* Review segment */}
              {segments.review > 0 && (
                <div
                  className="bg-green-500 transition-all duration-800 ease-out animate-[fillProgress_0.8s_ease-out_0.2s]"
                  style={{ width: `${segments.review}%` }}
                  title={`${deck.ankiStats.review} cartes maîtrisées`}
                />
              )}
            </div>
          </div>

          {/* Progress Labels */}
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full" />
              {deck.ankiStats.new} New
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              {deck.ankiStats.learning} Learning
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              {deck.ankiStats.review} Review
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
              <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
            </span>
          </>
        )}
      </div>

      {/* Quick Actions (revealed on hover) */}
      <div
        className={`flex gap-2 transition-all duration-200 ${
          isMobile
            ? 'opacity-100 translate-y-0'
            : isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Review Button */}
        <button
          onClick={() => onReview(deck.id)}
          disabled={!canReview}
          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
            canReview
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 focus:ring-cyan-500/50 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
          }`}
         
          aria-label={canReview ? 'Réviser les cartes' : 'Aucune carte à réviser'}
        >
          {canReview ? '⚡ Réviser' : 'Aucune carte'}
        </button>

        {/* Edit Button (hidden if imported) */}
        {!deck.isImported && (
          <button
            onClick={() => onEdit(deck.id)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
           
            aria-label="Éditer le deck"
          >
            ✎ Éditer
          </button>
        )}

        {/* Study Button */}
        <button
          onClick={() => onStudy(deck.id)}
          className="px-4 py-2 bg-transparent border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
         
          aria-label="Étudier le deck"
        >
          ▶ Étudier
        </button>
      </div>

      {/* Corner LED indicator */}
      {hasDueCards && (
        <div className="absolute top-3 right-12 w-2 h-2 rounded-full bg-red-500 opacity-60 animate-[pulse_2s_ease-in-out_infinite]" />
      )}

      {/* Scanline effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />

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
}
