'use client';

import { useMemo, useState } from 'react';

export interface APKGDeckSummary {
  ankiId: number;
  name: string;
  cardCount: number;
}

export type MergeMode = 'split' | 'merge';

export interface DeckSelectionResult {
  selectedIds: number[];
  mode: MergeMode;
  mergedName: string;
}

interface DeckSelectionModalProps {
  isOpen: boolean;
  decks: APKGDeckSummary[];
  defaultMergedName: string;
  isSubmitting: boolean;
  onConfirm: (result: DeckSelectionResult) => void;
  onCancel: () => void;
}

export default function DeckSelectionModal({
  isOpen,
  decks,
  defaultMergedName,
  isSubmitting,
  onConfirm,
  onCancel,
}: DeckSelectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(decks.map((d) => d.ankiId))
  );
  const [mode, setMode] = useState<MergeMode>('split');
  const [mergedName, setMergedName] = useState(defaultMergedName);

  const totalCards = useMemo(
    () =>
      decks
        .filter((d) => selectedIds.has(d.ankiId))
        .reduce((sum, d) => sum + d.cardCount, 0),
    [decks, selectedIds]
  );

  if (!isOpen) return null;

  const toggleDeck = (ankiId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ankiId)) next.delete(ankiId);
      else next.add(ankiId);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(decks.map((d) => d.ankiId)));
  const selectNone = () => setSelectedIds(new Set());

  const handleConfirm = () => {
    if (selectedIds.size === 0) return;
    onConfirm({
      selectedIds: Array.from(selectedIds),
      mode,
      mergedName: mode === 'merge' ? mergedName.trim() || defaultMergedName : '',
    });
  };

  const canConfirm =
    selectedIds.size > 0 && (mode !== 'merge' || mergedName.trim().length > 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl w-full max-w-lg border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-foreground">
            Plusieurs decks détectés
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Sélectionnez les decks à importer et choisissez s'ils doivent rester
            séparés ou être fusionnés.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-300">
                Decks ({selectedIds.size}/{decks.length} sélectionné
                {selectedIds.size > 1 ? 's' : ''} · {totalCards} cartes)
              </span>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-blue-400 hover:text-blue-300"
                  disabled={isSubmitting}
                >
                  Tout sélectionner
                </button>
                <span className="text-zinc-600">·</span>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-blue-400 hover:text-blue-300"
                  disabled={isSubmitting}
                >
                  Aucun
                </button>
              </div>
            </div>
            <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {decks.map((deck) => {
                const checked = selectedIds.has(deck.ankiId);
                return (
                  <li key={deck.ankiId}>
                    <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDeck(deck.ankiId)}
                        disabled={isSubmitting}
                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="flex-1 text-sm text-zinc-200 truncate">
                        {deck.name}
                      </span>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {deck.cardCount} carte{deck.cardCount > 1 ? 's' : ''}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2">
              Mode d'import
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                <input
                  type="radio"
                  name="merge-mode"
                  value="split"
                  checked={mode === 'split'}
                  onChange={() => setMode('split')}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm text-zinc-200">
                    Importer chaque deck séparément
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Crée {selectedIds.size > 0 ? selectedIds.size : 'N'} deck
                    {selectedIds.size > 1 ? 's' : ''} sur Mindup, un par deck Anki
                    sélectionné.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                <input
                  type="radio"
                  name="merge-mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm text-zinc-200">
                    Fusionner les decks sélectionnés en un seul
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Crée un unique deck Mindup contenant toutes les cartes.
                  </p>
                  {mode === 'merge' && (
                    <input
                      type="text"
                      value={mergedName}
                      onChange={(e) => setMergedName(e.target.value)}
                      placeholder="Nom du deck fusionné"
                      disabled={isSubmitting}
                      className="mt-2 w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      maxLength={100}
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Import en cours...' : 'Importer'}
          </button>
        </div>
      </div>
    </div>
  );
}
