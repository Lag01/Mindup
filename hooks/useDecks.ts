import { useEffect } from 'react';
import { useDecksStore, DeckWithStats } from '@/lib/store/decks';
import { useToast } from './useToast';

/**
 * Hook pour gérer les decks avec cache Zustand
 * Charge automatiquement les decks au montage
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

  const { showToast } = useToast();

  // Charger les decks au montage si pas encore chargés
  useEffect(() => {
    if (decks.length === 0 && !loading && !error) {
      fetchDecks();
    }
  }, []);

  // Afficher les erreurs via toast
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error]);

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
      showToast('Deck créé avec succès', 'success');
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
      showToast('Deck supprimé avec succès', 'success');
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
      showToast('Deck renommé avec succès', 'success');
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
    loading,
    error,
    createDeck,
    deleteDeck,
    renameDeck,
    refresh,
  };
}
