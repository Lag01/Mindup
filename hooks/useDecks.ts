import { useEffect, useRef } from 'react';
import { useDecksStore } from '@/lib/store/decks';
import { DeckWithStats } from '@/lib/types';
import { useToast } from './useToast';

// Intervalle minimum entre deux revalidations automatiques au focus, pour
// éviter de spammer l'API quand l'utilisateur switch fréquemment d'onglet.
const FOCUS_REVALIDATE_THROTTLE_MS = 30_000;

// Timestamp partagé entre toutes les instances de useDecks (module-level)
// pour throttler la revalidation au focus globalement.
let lastFocusRevalidateAt = 0;

/**
 * Hook pour gérer les decks avec cache Zustand
 * Charge automatiquement les decks au montage et revalide quand la fenêtre
 * regagne le focus (pour récupérer les changements faits sur une autre page
 * ou un autre onglet).
 */
export function useDecks() {
  const {
    decks,
    loading,
    error,
    fetchDecks,
    addDeck,
    updateDeck,
    removeDeck,
    setError,
  } = useDecksStore();

  const { success: showSuccess, error: showError } = useToast();

  // Charger les decks au mount si jamais fetchés. On utilise une ref locale
  // pour éviter le double-fetch en mode strict et pour ne pas dépendre de la
  // condition `decks.length === 0` qui peut empêcher un refetch légitime.
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current && !loading) {
      hasFetchedRef.current = true;
      fetchDecks();
    }
  }, [loading, fetchDecks]);

  // Pendant le tout premier rendu (avant que fetchDecks ait eu le temps de
  // set loading=true), on considère le hook comme "en chargement" pour
  // éviter un flash d'empty state.
  const effectiveLoading = loading || !hasFetchedRef.current;

  // Revalidation quand la fenêtre redevient visible (changement d'onglet,
  // retour depuis une autre app). Throttlé pour ne pas spammer l'API.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFocusRevalidateAt < FOCUS_REVALIDATE_THROTTLE_MS) return;
      lastFocusRevalidateAt = now;
      fetchDecks();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchDecks]);

  // Afficher les erreurs via toast
  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  /**
   * Créer un nouveau deck
   */
  const createDeck = async (name: string): Promise<DeckWithStats | null> => {
    try {
      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création');
      }

      const data = await response.json();
      const newDeck = {
        ...data.deck,
        createdAt: new Date(data.deck.createdAt),
      };

      addDeck(newDeck);
      showSuccess('Deck créé avec succès');
      return newDeck;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(message);
      return null;
    }
  };

  /**
   * Supprimer un deck
   */
  const deleteDeck = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/decks?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      removeDeck(id);
      showSuccess('Deck supprimé avec succès');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(message);
      return false;
    }
  };

  /**
   * Mettre à jour un deck
   */
  const renameDeck = async (id: string, name: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/decks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour');
      }

      updateDeck(id, { name });
      showSuccess('Deck renommé avec succès');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(message);
      return false;
    }
  };

  /**
   * Rafraîchir la liste des decks
   */
  const refresh = async () => {
    await fetchDecks();
  };

  return {
    decks,
    loading: effectiveLoading,
    error,
    createDeck,
    deleteDeck,
    renameDeck,
    refresh,
    // Mutations bas-niveau du store : à utiliser quand la mutation HTTP est
    // déjà effectuée ailleurs (ex: modale qui PATCH elle-même) et qu'il faut
    // juste synchroniser le store sans refaire l'appel réseau.
    updateDeck,
    addDeck,
    removeDeck,
  };
}
