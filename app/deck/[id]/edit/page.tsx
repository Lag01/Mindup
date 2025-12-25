'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDebounce } from '@/hooks/useDebounce';
import { DeckWithCards, CardFormData, FieldsVisibility, ContentType, PaginationMeta, DeckCardsApiResponse } from '@/lib/types';
import { SearchBar } from './components/SearchBar';
import { DuplicateWarning } from './components/DuplicateWarning';
import { BulkActions } from './components/BulkActions';
import { CardEditor } from './components/CardEditor';
import { CardListItem } from './components/CardListItem';
import { LoadMoreButton } from './components/LoadMoreButton';

export default function EditDeck() {
  const params = useParams();
  const deckId = params.id as string;
  const router = useRouter();
  const { isAdmin } = useUser();

  // État principal
  const [deck, setDeck] = useState<DeckWithCards | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Formulaire d'édition
  const [editForm, setEditForm] = useState<CardFormData>({
    front: '',
    back: '',
    frontType: 'TEXT',
    backType: 'TEXT',
    frontImage: null,
    backImage: null,
  });

  const [editFrontFieldsVisibility, setEditFrontFieldsVisibility] = useState<FieldsVisibility>({
    showText: true,
    showLatex: false,
    showImage: false,
  });

  const [editBackFieldsVisibility, setEditBackFieldsVisibility] = useState<FieldsVisibility>({
    showText: true,
    showLatex: false,
    showImage: false,
  });

  // Détection des doublons avec hook mémoïsé
  const duplicates = useDuplicateDetection(deck?.cards ?? []);

  // Fetch deck
  useEffect(() => {
    fetchDeck();
  }, [deckId]);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchDeck = async (page: number = 1, append: boolean = false) => {
    try {
      // Loading différencié : global pour page 1, local pour "Charger plus"
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`/api/decks/${deckId}/cards?page=${page}&limit=50`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch deck');
      }

      const data: DeckCardsApiResponse = await response.json();

      // Bloquer l'accès si le deck est importé
      if (data.deck.originalDeckId) {
        alert('Vous ne pouvez pas éditer un deck importé. Il est synchronisé avec le deck public.');
        router.push('/dashboard');
        return;
      }

      // Accumuler les cartes si append = true, sinon remplacer
      if (append && deck) {
        setDeck(prev => ({
          ...data.deck,
          cards: [...(prev?.cards ?? []), ...data.deck.cards],
        }));
      } else {
        setDeck(data.deck);
      }

      // Sauvegarder métadonnées pagination
      setPaginationMeta(data.pagination);
      setCurrentPage(page);

    } catch (error) {
      console.error('Error fetching deck:', error);
      alert('Erreur lors du chargement des cartes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  /**
   * Charge la page suivante et ajoute les cartes à la liste
   */
  const loadMoreCards = useCallback(async () => {
    if (!paginationMeta?.hasNextPage || loadingMore) return;

    const nextPage = currentPage + 1;
    await fetchDeck(nextPage, true); // append = true
  }, [paginationMeta, currentPage, loadingMore, fetchDeck]);

  const startEdit = (cardId: string) => {
    const card = deck?.cards.find(c => c.id === cardId);
    if (!card) return;

    setEditingCard(card.id);
    setEditForm({
      front: card.front,
      back: card.back,
      frontType: card.frontType,
      backType: card.backType,
      frontImage: card.frontImage,
      backImage: card.backImage,
    });

    // Initialiser les toggles basés sur le contenu existant de la carte
    const hasFrontText = card.front.trim().length > 0;
    setEditFrontFieldsVisibility({
      showText: card.frontType === 'TEXT' && hasFrontText,
      showLatex: card.frontType === 'LATEX' && hasFrontText,
      showImage: card.frontImage !== null,
    });

    const hasBackText = card.back.trim().length > 0;
    setEditBackFieldsVisibility({
      showText: card.backType === 'TEXT' && hasBackText,
      showLatex: card.backType === 'LATEX' && hasBackText,
      showImage: card.backImage !== null,
    });
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setEditForm({
      front: '',
      back: '',
      frontType: 'TEXT',
      backType: 'TEXT',
      frontImage: null,
      backImage: null,
    });

    // Reset des toggles
    setEditFrontFieldsVisibility({
      showText: true,
      showLatex: false,
      showImage: false,
    });
    setEditBackFieldsVisibility({
      showText: true,
      showLatex: false,
      showImage: false,
    });
  };

  const saveCard = async () => {
    if (!editingCard) return;

    // Valider qu'il y a du contenu
    const hasFrontContent =
      ((editFrontFieldsVisibility.showText || editFrontFieldsVisibility.showLatex) && editForm.front.trim()) ||
      (editFrontFieldsVisibility.showImage && editForm.frontImage);

    const hasBackContent =
      ((editBackFieldsVisibility.showText || editBackFieldsVisibility.showLatex) && editForm.back.trim()) ||
      (editBackFieldsVisibility.showImage && editForm.backImage);

    if (!hasFrontContent || !hasBackContent) {
      alert('⚠️ Le recto et le verso doivent contenir du texte ou une image');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/cards/${editingCard}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update card');
      }

      const data = await response.json();

      // Update local state
      setDeck(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map(card =>
            card.id === editingCard ? data.card : card
          ),
        };
      });

      cancelEdit();
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Erreur lors de la mise à jour de la carte');
    } finally {
      setSaving(false);
    }
  };

  // Raccourcis clavier
  useKeyboardShortcuts({
    onEscape: cancelEdit,
    onCtrlEnter: saveCard,
    enabled: !!editingCard,
  });

  const deleteCard = async (cardId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
      return;
    }

    setDeleting(cardId);
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete card');
      }

      // Update local state
      setDeck(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.filter(card => card.id !== cardId),
        };
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Erreur lors de la suppression de la carte');
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkUpdate = async (updateFront: boolean, updateBack: boolean, targetType: ContentType) => {
    const action = updateFront && updateBack ? 'tous les rectos ET versos' : updateFront ? 'tous les rectos' : 'tous les versos';
    if (!confirm(`Êtes-vous sûr de vouloir changer ${action} en ${targetType} ?`)) {
      return;
    }

    setBulkUpdating(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/bulk-update-types`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updateFront, updateBack, targetType }),
      });

      if (!response.ok) {
        throw new Error('Failed to bulk update');
      }

      // Refresh the deck data
      await fetchDeck();
      alert('Mise à jour effectuée avec succès !');
    } catch (error) {
      console.error('Error bulk updating:', error);
      alert('Erreur lors de la mise à jour en masse');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleSwapAll = async () => {
    const cardCount = deck?.cards.length || 0;
    if (!confirm(`Voulez-vous inverser le recto et le verso de toutes les cartes (${cardCount} carte${cardCount > 1 ? 's' : ''}) ?\n\nCette action est réversible en cliquant à nouveau sur ce bouton.`)) {
      return;
    }

    setBulkUpdating(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/swap-all`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to swap cards');
      }

      // Refresh the deck data
      await fetchDeck();
      alert('Inversion effectuée avec succès !');
    } catch (error) {
      console.error('Error swapping cards:', error);
      alert('Erreur lors de l\'inversion des cartes');
    } finally {
      setBulkUpdating(false);
    }
  };

  const swapEditFormFrontBack = () => {
    setEditForm(prev => ({
      front: prev.back,
      back: prev.front,
      frontType: prev.backType,
      backType: prev.frontType,
      frontImage: prev.backImage,
      backImage: prev.frontImage,
    }));

    // Swap des états de visibilité
    const tempFrontVisibility = editFrontFieldsVisibility;
    setEditFrontFieldsVisibility(editBackFieldsVisibility);
    setEditBackFieldsVisibility(tempFrontVisibility);
  };

  const handleSearchDuplicate = (text: string) => {
    // Remplir la barre de recherche avec le texte original
    setSearchQuery(text);

    // Scroll vers la liste des cartes
    setTimeout(() => {
      const cardsContainer = document.querySelector('[data-cards-list]');
      cardsContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Debounce de la recherche pour éviter les recalculs trop fréquents
  // ✅ Hook déplacé AVANT le return conditionnel pour respecter les Rules of Hooks
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Mémoriser le filtrage pour éviter les recalculs inutiles
  // ✅ Hook déplacé AVANT le return conditionnel pour respecter les Rules of Hooks
  const filteredCards = useMemo(() => {
    if (!deck) return [];
    if (!debouncedSearchQuery.trim()) {
      return deck.cards;
    }
    const query = debouncedSearchQuery.toLowerCase();
    return deck.cards.filter(card =>
      card.front.toLowerCase().includes(query) ||
      card.back.toLowerCase().includes(query)
    );
  }, [deck, debouncedSearchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground text-lg">Chargement...</div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground text-lg">Deck non trouvé</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4 gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
              Éditer : {deck.name}
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-3 py-2 sm:px-4 rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              <span className="hidden sm:inline">Retour au dashboard</span>
              <span className="sm:hidden">Retour</span>
            </button>
          </div>

          {/* Barre de recherche */}
          {deck.cards.length > 0 && (
            <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Bulk Actions Section */}
        <BulkActions
          onBulkUpdate={handleBulkUpdate}
          onSwapAll={handleSwapAll}
          bulkUpdating={bulkUpdating}
          cardCount={deck.cards.length}
        />

        {/* Section d'avertissement des doublons */}
        <DuplicateWarning duplicates={duplicates} onSearchDuplicate={handleSearchDuplicate} />

        {/* Add Card Button */}
        <div className="mb-6">
          <Link
            href={`/deck/${deckId}/add`}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-medium py-4 px-6 rounded-lg shadow-lg shadow-cyan-500/20 transition-all duration-200 ease-out hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter une carte
          </Link>
        </div>

        {/* Cards List */}
        {filteredCards.length === 0 && deck.cards.length > 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg mb-4">
              Aucune carte trouvée pour "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Effacer la recherche
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3" data-cards-list>
              {filteredCards.map((card, index) => {
              // Vérifier si la carte est en doublon
              const isCardDuplicate = duplicates.some(d =>
                d.locations.some(loc => loc.cardId === card.id)
              );

              return (
                <div key={card.id}>
                  {editingCard === card.id ? (
                    // Mode édition
                    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground">
                          Carte {index + 1}
                        </h3>
                      </div>
                      <CardEditor
                        formData={editForm}
                        frontVisibility={editFrontFieldsVisibility}
                        backVisibility={editBackFieldsVisibility}
                        isAdmin={isAdmin}
                        saving={saving}
                        onFormChange={(updates) => setEditForm(prev => ({ ...prev, ...updates }))}
                        onFrontVisibilityChange={(updates) => setEditFrontFieldsVisibility(prev => ({ ...prev, ...updates }))}
                        onBackVisibilityChange={(updates) => setEditBackFieldsVisibility(prev => ({ ...prev, ...updates }))}
                        onSwap={swapEditFormFrontBack}
                        onCancel={cancelEdit}
                        onSave={saveCard}
                      />
                    </div>
                  ) : (
                    // Mode lecture
                    <CardListItem
                      card={card}
                      index={index}
                      isDuplicate={isCardDuplicate}
                      deleting={deleting === card.id}
                      onEdit={() => startEdit(card.id)}
                      onDelete={() => deleteCard(card.id)}
                    />
                  )}
                </div>
              );
              })}
            </div>

            {/* Bouton "Charger plus" */}
            {!debouncedSearchQuery.trim() && paginationMeta && paginationMeta.hasNextPage && (
              <LoadMoreButton
                loading={loadingMore}
                disabled={loadingMore}
                remainingCards={paginationMeta.totalCards - deck!.cards.length}
                onClick={loadMoreCards}
              />
            )}

            {/* Indicateur de progression */}
            {!debouncedSearchQuery.trim() && paginationMeta && (
              <div className="text-center py-4 text-zinc-400 text-sm">
                {deck!.cards.length} / {paginationMeta.totalCards} cartes chargées
              </div>
            )}
          </>
        )}
      </main>

      {/* Bouton retour en haut */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-cyan-500 hover:bg-cyan-400 text-white p-3 sm:p-4 rounded-full shadow-lg shadow-cyan-500/30 transition-all duration-200 ease-out hover:-translate-y-1 z-50 flex items-center justify-center"
          aria-label="Retour en haut"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
