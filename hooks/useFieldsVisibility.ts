import { useState, useCallback } from 'react';
import { FieldsVisibility } from '@/lib/types';

/**
 * Hook pour gérer la visibilité des champs (texte, LaTeX, image)
 * Élimine la duplication de logique dans add/edit pages
 *
 * @param initialState - État initial de visibilité (par défaut: texte visible)
 * @returns Objet contenant l'état, les setters et les helpers
 *
 * @example
 * const frontFields = useFieldsVisibility();
 * const backFields = useFieldsVisibility();
 *
 * // Mettre à jour
 * frontFields.update({ showLatex: true });
 *
 * // Reset
 * frontFields.reset();
 *
 * // Charger depuis une carte
 * frontFields.loadFromCard(card.frontType, card.front, card.frontImage);
 */
export function useFieldsVisibility(
  initialState: FieldsVisibility = {
    showText: true,
    showLatex: false,
    showImage: false,
  }
) {
  const [visibility, setVisibility] = useState<FieldsVisibility>(initialState);

  /**
   * Mettre à jour la visibilité (fusion partielle)
   */
  const update = useCallback((updates: Partial<FieldsVisibility>) => {
    setVisibility(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Réinitialiser aux valeurs par défaut
   */
  const reset = useCallback(() => {
    setVisibility(initialState);
  }, [initialState]);

  /**
   * Charger la visibilité depuis une carte existante
   * Utile pour l'édition de cartes
   */
  const loadFromCard = useCallback((
    type: 'TEXT' | 'LATEX',
    content: string,
    image: string | null
  ) => {
    const hasContent = content.trim().length > 0;
    setVisibility({
      showText: type === 'TEXT' && hasContent,
      showLatex: type === 'LATEX' && hasContent,
      showImage: image !== null,
    });
  }, []);

  /**
   * Basculer un champ spécifique
   */
  const toggle = useCallback((field: keyof FieldsVisibility) => {
    setVisibility(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  }, []);

  /**
   * Définir toutes les valeurs en une fois
   */
  const set = useCallback((newVisibility: FieldsVisibility) => {
    setVisibility(newVisibility);
  }, []);

  return {
    visibility,
    update,
    reset,
    loadFromCard,
    toggle,
    set,
    // Helpers pour accès direct (compatibilité avec code existant)
    showText: visibility.showText,
    showLatex: visibility.showLatex,
    showImage: visibility.showImage,
  };
}
