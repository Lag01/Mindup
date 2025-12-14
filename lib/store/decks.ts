import { create } from 'zustand';

export interface DeckWithStats {
  id: string;
  name: string;
  createdAt: Date;
  isPublic: boolean;
  originalDeckId: string | null;
  importCount: number;
  totalCards: number;
  totalReviews: number;
}

interface DecksState {
  decks: DeckWithStats[];
  loading: boolean;
  error: string | null;

  // Actions
  setDecks: (decks: DeckWithStats[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // CRUD operations
  addDeck: (deck: DeckWithStats) => void;
  updateDeck: (id: string, updates: Partial<DeckWithStats>) => void;
  removeDeck: (id: string) => void;

  // Fetch operation
  fetchDecks: () => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  decks: [],
  loading: false,
  error: null,
};

export const useDecksStore = create<DecksState>((set, get) => ({
  ...initialState,

  setDecks: (decks) => set({ decks, error: null }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  addDeck: (deck) => set((state) => ({
    decks: [deck, ...state.decks],
  })),

  updateDeck: (id, updates) => set((state) => ({
    decks: state.decks.map((deck) =>
      deck.id === id ? { ...deck, ...updates } : deck
    ),
  })),

  removeDeck: (id) => set((state) => ({
    decks: state.decks.filter((deck) => deck.id !== id),
  })),

  fetchDecks: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/decks');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement des decks');
      }

      const data = await response.json();

      // Convertir les dates string en Date objects
      const decks = data.decks.map((deck: any) => ({
        ...deck,
        createdAt: new Date(deck.createdAt),
      }));

      set({ decks, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, loading: false });
      console.error('Error fetching decks:', error);
    }
  },

  reset: () => set(initialState),
}));
