import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onEscape?: () => void;
  onCtrlEnter?: () => void;
  enabled?: boolean;
  formSelector?: string;
}

/**
 * Hook pour gérer les raccourcis clavier dans un formulaire
 *
 * Raccourcis :
 * - Escape : Annuler l'édition
 * - Ctrl+Enter : Sauvegarder
 *
 * @param config - Configuration des callbacks et conditions
 */
export function useKeyboardShortcuts({
  onEscape,
  onCtrlEnter,
  enabled = true,
  formSelector = '[data-card-form]',
}: KeyboardShortcutsConfig): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyboard = (e: KeyboardEvent) => {
      // Ignorer si on est dans un input/textarea autre que les champs du formulaire
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && !target.closest(formSelector)) {
        return;
      }

      // Échap : Annuler
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }

      // Ctrl+Enter : Sauvegarder
      if (e.ctrlKey && e.key === 'Enter' && onCtrlEnter) {
        e.preventDefault();
        onCtrlEnter();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [onEscape, onCtrlEnter, enabled, formSelector]);
}
