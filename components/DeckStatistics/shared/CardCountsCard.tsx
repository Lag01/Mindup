'use client';

import { CARD_CATEGORIES } from '@/lib/cardCategories';

export interface CardCounts {
  new: number;
  learning: number;
  relearning: number;
  young: number;
  mature: number;
}

interface CardCountsCardProps {
  counts: CardCounts;
}

// Catégories façon « Nombre de cartes » d'Anki, alignées sur la source unique
// (lib/cardCategories). Les états Suspendues/Enfouies ne sont pas gérés par
// l'application et sont donc omis.
const CATEGORIES = CARD_CATEGORIES;

export default function CardCountsCard({ counts }: CardCountsCardProps) {
  const total = counts.new + counts.learning + counts.relearning + counts.young + counts.mature;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Nombre de cartes</h3>
        <p className="mt-1 text-xs text-zinc-400">
          Répartition des {total} carte{total !== 1 ? 's' : ''} par catégorie Anki.
        </p>
      </div>

      {/* Barre de répartition empilée */}
      {total > 0 && (
        <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-zinc-800">
          {CATEGORIES.map(c =>
            counts[c.key] > 0 ? (
              <div
                key={c.key}
                className={c.dot}
                style={{ width: `${(counts[c.key] / total) * 100}%` }}
                title={`${counts[c.key]} ${c.label.toLowerCase()}`}
              />
            ) : null
          )}
        </div>
      )}

      <div className="space-y-2">
        {CATEGORIES.map(c => (
          <div key={c.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-300">
              <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
              {c.label}
            </span>
            <span className="flex items-center gap-2">
              <span className={`font-semibold tabular-nums ${c.text}`}>{counts[c.key]}</span>
              <span className="w-10 text-right text-xs text-zinc-500 tabular-nums">
                {total > 0 ? `${Math.round((counts[c.key] / total) * 100)}%` : '0%'}
              </span>
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-2 text-sm">
          <span className="font-medium text-zinc-200">Total</span>
          <span className="font-bold tabular-nums text-foreground">{total}</span>
        </div>
      </div>
    </div>
  );
}
