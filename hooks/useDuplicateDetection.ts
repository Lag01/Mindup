import { useMemo } from 'react';
import { Card, DuplicateGroup, DuplicateLocation } from '@/lib/types';

/**
 * Hook pour détecter les doublons dans un deck de cartes
 *
 * Compare le texte normalisé (trimmed + lowercase) des rectos et versos
 * pour identifier les duplications
 *
 * @param cards - Tableau de cartes à analyser
 * @returns Tableau de groupes de doublons triés par nombre d'occurrences
 */
export function useDuplicateDetection(cards: Card[]): DuplicateGroup[] {
  return useMemo(() => {
    try {
      if (!cards || !Array.isArray(cards)) {
        console.warn('Invalid cards array provided to useDuplicateDetection');
        return [];
      }

      const textMap = new Map<string, DuplicateGroup>();

      cards.forEach((card, index) => {
        // Traiter le recto
        const frontNorm = normalizeText(card.front);
        if (frontNorm) {
          addToMap(textMap, frontNorm, card.front, card.id, 'front', index + 1);
        }

        // Traiter le verso
        const backNorm = normalizeText(card.back);
        if (backNorm) {
          addToMap(textMap, backNorm, card.back, card.id, 'back', index + 1);
        }
      });

      // Filtrer pour garder uniquement les doublons (count >= 2)
      // et trier par count décroissant
      return Array.from(textMap.values())
        .filter(group => group.count >= 2)
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      return [];
    }
  }, [cards]);
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Normalise le texte pour la comparaison
 * @param text - Texte à normaliser
 * @returns Texte normalisé (trimmed + lowercase) ou null si vide
 */
function normalizeText(text: string): string | null {
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

/**
 * Ajoute un texte à la map de doublons
 */
function addToMap(
  map: Map<string, DuplicateGroup>,
  normalizedText: string,
  originalText: string,
  cardId: string,
  field: 'front' | 'back',
  order: number
): void {
  if (!map.has(normalizedText)) {
    map.set(normalizedText, {
      text: originalText,
      normalizedText,
      locations: [],
      count: 0,
    });
  }

  const group = map.get(normalizedText)!;
  group.locations.push({ cardId, field, order });
  group.count++;
}
