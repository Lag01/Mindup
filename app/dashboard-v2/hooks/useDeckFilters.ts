import { useMemo } from 'react';
import { DeckWithStats } from '@/lib/types';

export type FilterType = 'all' | 'anki' | 'due' | 'imported';

export function useDeckFilters(
  decks: DeckWithStats[],
  activeFilter: FilterType,
  searchQuery: string
) {
  const filteredDecks = useMemo(() => {
    let result = [...decks];

    // Appliquer le filtre de type
    switch (activeFilter) {
      case 'anki':
        result = result.filter(deck => deck.learningMethod === 'ANKI');
        break;
      case 'due':
        result = result.filter(
          deck => deck.learningMethod === 'ANKI' && (deck.ankiStats?.due ?? 0) > 0
        );
        break;
      case 'imported':
        result = result.filter(deck => deck.isImported);
        break;
      case 'all':
      default:
        // Pas de filtrage
        break;
    }

    // Appliquer la recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(deck => deck.name.toLowerCase().includes(query));
    }

    return result;
  }, [decks, activeFilter, searchQuery]);

  // Calculer les counts pour les badges des filtres
  const filterCounts = useMemo(() => {
    return {
      all: decks.length,
      anki: decks.filter(d => d.learningMethod === 'ANKI').length,
      due: decks.filter(d => d.learningMethod === 'ANKI' && (d.ankiStats?.due ?? 0) > 0).length,
      imported: decks.filter(d => d.isImported).length,
    };
  }, [decks]);

  return {
    filteredDecks,
    filterCounts,
  };
}
