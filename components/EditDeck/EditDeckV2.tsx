'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useUser } from '@/hooks/useUser';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDebounce } from '@/hooks/useDebounce';
import { DeckWithCards, CardFormData, FieldsVisibility, ContentType, PaginationMeta, DeckCardsApiResponse, DeckSearchApiResponse, Card } from '@/lib/types';
import { SearchBar } from '@/app/deck/[id]/edit/components/SearchBar';
import { DuplicateWarning } from '@/app/deck/[id]/edit/components/DuplicateWarning';
import { BulkActions } from '@/app/deck/[id]/edit/components/BulkActions';
import { CardEditor } from '@/app/deck/[id]/edit/components/CardEditor';
import { CardListItem } from '@/app/deck/[id]/edit/components/CardListItem';
import { LoadMoreButton } from '@/app/deck/[id]/edit/components/LoadMoreButton';

export default function EditDeckV2() {
  const params = useParams();
  const deckId = params.id as string;
  const router = useRouter();
  const { isAdmin } = useUser();

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

  const [searchMode, setSearchMode] = useState<'local' | 'global'>('local');
  const [isSearchingGlobally, setIsSearchingGlobally] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<Card[] | null>(null);
  const [globalSearchMeta, setGlobalSearchMeta] = useState<PaginationMeta | null>(null);

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

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const duplicates = useDuplicateDetection(deck?.cards ?? []);

  useEffect(() => {
    fetchDeck();
  }, [deckId]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setSearchMode('local');
      setGlobalSearchResults(null);
      setGlobalSearchMeta(null);
      return;
    }
    searchGlobally(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  const fetchDeck = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) { setLoading(true); } else { setLoadingMore(true); }

      const response = await fetch(`/api/decks/${deckId}/cards?page=${page}&limit=50`);

      if (!response.ok) {
        if (response.status === 401) { router.push('/'); return; }
        throw new Error('Failed to fetch deck');
      }

      const data: DeckCardsApiResponse = await response.json();

      if (data.deck.originalDeckId) {
        alert('Vous ne pouvez pas éditer un deck importé. Il est synchronisé avec le deck public.');
        router.push('/dashboard-entry');
        return;
      }

      if (append && deck) {
        setDeck(prev => ({ ...data.deck, cards: [...(prev?.cards ?? []), ...data.deck.cards] }));
      } else {
        setDeck(data.deck);
      }

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

  const loadMoreCards = useCallback(async () => {
    if (!paginationMeta?.hasNextPage || loadingMore) return;
    await fetchDeck(currentPage + 1, true);
  }, [paginationMeta, currentPage, loadingMore, fetchDeck]);

  const searchGlobally = async (query: string, page: number = 1) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchMode('local');
      setGlobalSearchResults(null);
      setGlobalSearchMeta(null);
      return;
    }

    setIsSearchingGlobally(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/search?q=${encodeURIComponent(query)}&page=${page}&limit=50`);
      if (!response.ok) throw new Error('Search failed');
      const data: DeckSearchApiResponse = await response.json();
      setSearchMode('global');
      setGlobalSearchResults(data.deck.cards);
      setGlobalSearchMeta(data.pagination);
    } catch (error) {
      console.error('Global search error:', error);
      alert('Erreur lors de la recherche globale');
    } finally {
      setIsSearchingGlobally(false);
    }
  };

  const loadMoreSearchResults = useCallback(async () => {
    if (!globalSearchMeta?.hasNextPage || isSearchingGlobally) return;
    const nextPage = globalSearchMeta.page + 1;
    setIsSearchingGlobally(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/search?q=${encodeURIComponent(debouncedSearchQuery)}&page=${nextPage}&limit=50`);
      if (!response.ok) throw new Error('Search pagination failed');
      const data: DeckSearchApiResponse = await response.json();
      setGlobalSearchResults(prev => [...(prev || []), ...data.deck.cards]);
      setGlobalSearchMeta(data.pagination);
    } catch (error) {
      console.error('Search pagination error:', error);
    } finally {
      setIsSearchingGlobally(false);
    }
  }, [globalSearchMeta, debouncedSearchQuery, isSearchingGlobally, deckId]);

  const findCardById = useCallback((cardId: string): Card | undefined => {
    if (searchMode === 'global' && globalSearchResults) return globalSearchResults.find(c => c.id === cardId);
    return deck?.cards.find(c => c.id === cardId);
  }, [searchMode, globalSearchResults, deck?.cards]);

  const startEdit = (cardId: string) => {
    const card = findCardById(cardId);
    if (!card) return;
    setEditingCard(card.id);
    setEditForm({ front: card.front, back: card.back, frontType: card.frontType, backType: card.backType, frontImage: card.frontImage, backImage: card.backImage });
    const hasFrontText = card.front.trim().length > 0;
    setEditFrontFieldsVisibility({ showText: card.frontType === 'TEXT' && hasFrontText, showLatex: card.frontType === 'LATEX' && hasFrontText, showImage: card.frontImage !== null });
    const hasBackText = card.back.trim().length > 0;
    setEditBackFieldsVisibility({ showText: card.backType === 'TEXT' && hasBackText, showLatex: card.backType === 'LATEX' && hasBackText, showImage: card.backImage !== null });
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setEditForm({ front: '', back: '', frontType: 'TEXT', backType: 'TEXT', frontImage: null, backImage: null });
    setEditFrontFieldsVisibility({ showText: true, showLatex: false, showImage: false });
    setEditBackFieldsVisibility({ showText: true, showLatex: false, showImage: false });
  };

  const saveCard = async () => {
    if (!editingCard) return;
    const hasFrontContent = ((editFrontFieldsVisibility.showText || editFrontFieldsVisibility.showLatex) && editForm.front.trim()) || (editFrontFieldsVisibility.showImage && editForm.frontImage);
    const hasBackContent = ((editBackFieldsVisibility.showText || editBackFieldsVisibility.showLatex) && editForm.back.trim()) || (editBackFieldsVisibility.showImage && editForm.backImage);
    if (!hasFrontContent || !hasBackContent) { alert('Le recto et le verso doivent contenir du texte ou une image'); return; }

    setSaving(true);
    try {
      const response = await fetch(`/api/cards/${editingCard}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      if (!response.ok) throw new Error('Failed to update card');
      const data = await response.json();
      setDeck(prev => { if (!prev) return prev; return { ...prev, cards: prev.cards.map(card => card.id === editingCard ? data.card : card) }; });
      if (searchMode === 'global' && debouncedSearchQuery) await searchGlobally(debouncedSearchQuery);
      cancelEdit();
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Erreur lors de la mise à jour de la carte');
    } finally {
      setSaving(false);
    }
  };

  useKeyboardShortcuts({ onEscape: cancelEdit, onCtrlEnter: saveCard, enabled: !!editingCard });

  const deleteCard = async (cardId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) return;
    setDeleting(cardId);
    try {
      const response = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete card');
      setDeck(prev => { if (!prev) return prev; return { ...prev, cards: prev.cards.filter(card => card.id !== cardId) }; });
      if (searchMode === 'global' && debouncedSearchQuery) await searchGlobally(debouncedSearchQuery);
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Erreur lors de la suppression de la carte');
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkUpdate = async (updateFront: boolean, updateBack: boolean, targetType: ContentType) => {
    const action = updateFront && updateBack ? 'tous les rectos ET versos' : updateFront ? 'tous les rectos' : 'tous les versos';
    if (!confirm(`Êtes-vous sûr de vouloir changer ${action} en ${targetType} ?`)) return;
    setBulkUpdating(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/bulk-update-types`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updateFront, updateBack, targetType }) });
      if (!response.ok) throw new Error('Failed to bulk update');
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
    if (!confirm(`Voulez-vous inverser le recto et le verso de toutes les cartes (${cardCount} carte${cardCount > 1 ? 's' : ''}) ?`)) return;
    setBulkUpdating(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/swap-all`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error('Failed to swap cards');
      await fetchDeck();
      alert('Inversion effectuée avec succès !');
    } catch (error) {
      console.error('Error swapping cards:', error);
      alert("Erreur lors de l'inversion des cartes");
    } finally {
      setBulkUpdating(false);
    }
  };

  const swapEditFormFrontBack = () => {
    setEditForm(prev => ({ front: prev.back, back: prev.front, frontType: prev.backType, backType: prev.frontType, frontImage: prev.backImage, backImage: prev.frontImage }));
    const tempFrontVisibility = editFrontFieldsVisibility;
    setEditFrontFieldsVisibility(editBackFieldsVisibility);
    setEditBackFieldsVisibility(tempFrontVisibility);
  };

  const handleSearchDuplicate = (text: string) => {
    setSearchQuery(text);
    setTimeout(() => {
      const cardsContainer = document.querySelector('[data-cards-list]');
      cardsContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const filteredCards = useMemo(() => {
    if (!deck) return [];
    if (searchMode === 'global' && globalSearchResults) return globalSearchResults;
    if (!debouncedSearchQuery.trim()) return deck.cards;
    const query = debouncedSearchQuery.toLowerCase();
    return deck.cards.filter(card => card.front.toLowerCase().includes(query) || card.back.toLowerCase().includes(query));
  }, [deck, debouncedSearchQuery, searchMode, globalSearchResults]);

  if (loading) return <LoadingAnimation fullScreen />;

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="text-foreground text-lg">Deck non trouvé</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header V2 */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4 gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
              Éditer : {deck.name}
            </h1>
            <button
              onClick={() => router.push('/dashboard-entry')}
              className="bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-300 font-medium px-3 py-2 sm:px-4 rounded-lg transition-all text-sm sm:text-base whitespace-nowrap border border-zinc-700/50"
            >
              <span className="hidden sm:inline">Retour au dashboard</span>
              <span className="sm:hidden">Retour</span>
            </button>
          </div>

          {deck.cards.length > 0 && (
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchMode={searchMode}
              isSearching={isSearchingGlobally}
              totalResults={globalSearchMeta?.totalCards}
            />
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <BulkActions
          onBulkUpdate={handleBulkUpdate}
          onSwapAll={handleSwapAll}
          bulkUpdating={bulkUpdating}
          cardCount={deck.cards.length}
        />

        <DuplicateWarning duplicates={duplicates} onSearchDuplicate={handleSearchDuplicate} />

        <div className="mb-6">
          <Link
            href={`/deck/${deckId}/add`}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter une carte
          </Link>
        </div>

        {filteredCards.length === 0 && deck.cards.length > 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-zinc-400 text-lg mb-2">Aucune carte trouvée pour "{searchQuery}"</p>
            {searchMode === 'global' && globalSearchMeta && (
              <p className="text-zinc-500 text-sm mb-4">Recherche effectuée dans les {globalSearchMeta.totalCards > 0 ? globalSearchMeta.totalCards : paginationMeta?.totalCards || 0} cartes du deck</p>
            )}
            <button
              onClick={() => setSearchQuery('')}
              className="bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 font-medium px-6 py-3 rounded-lg transition-all border border-zinc-700/50"
            >
              Effacer la recherche
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3" data-cards-list>
              {filteredCards.map((card, index) => {
                const isCardDuplicate = duplicates.some(d => d.locations.some(loc => loc.cardId === card.id));
                return (
                  <div key={card.id}>
                    {editingCard === card.id ? (
                      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground">Carte {index + 1}</h3>
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

            {searchMode === 'global' && globalSearchMeta && globalSearchMeta.hasNextPage && (
              <LoadMoreButton loading={isSearchingGlobally} disabled={isSearchingGlobally} remainingCards={globalSearchMeta.totalCards - (globalSearchResults?.length || 0)} onClick={loadMoreSearchResults} />
            )}

            {searchMode === 'local' && !debouncedSearchQuery.trim() && paginationMeta && paginationMeta.hasNextPage && (
              <LoadMoreButton loading={loadingMore} disabled={loadingMore} remainingCards={paginationMeta.totalCards - deck!.cards.length} onClick={loadMoreCards} />
            )}

            {searchMode === 'local' && !debouncedSearchQuery.trim() && paginationMeta && (
              <div className="text-center py-4 text-zinc-500 text-sm">{deck!.cards.length} / {paginationMeta.totalCards} cartes chargées</div>
            )}

            {searchMode === 'global' && globalSearchMeta && (
              <div className="text-center py-4 text-zinc-500 text-sm">{globalSearchResults?.length || 0} / {globalSearchMeta.totalCards} résultat{globalSearchMeta.totalCards > 1 ? 's' : ''} affiché{globalSearchMeta.totalCards > 1 ? 's' : ''}</div>
            )}
          </>
        )}
      </main>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white p-3 sm:p-4 rounded-full shadow-lg shadow-blue-500/20 transition-all duration-300 z-50 flex items-center justify-center"
          aria-label="Retour en haut"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}
