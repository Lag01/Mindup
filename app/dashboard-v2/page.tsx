'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DeckWithStats } from '@/lib/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useUser } from '@/hooks/useUser';
import { useDeckFilters } from './hooks/useDeckFilters';
import type { FilterType } from './hooks/useDeckFilters';
import CompactHeader from './components/CompactHeader';
import HeroStats from './components/HeroStats';
import QuickFilters from './components/QuickFilters';
import DeckGrid from './components/DeckGrid';
import EmptyState from './components/EmptyState';
import LoadingAnimation from '@/components/LoadingAnimation';
import CreateDeckModal from '@/components/CreateDeckModal';
import EditDeckNameModal from '@/components/EditDeckNameModal';

export default function DashboardV2() {
  const [decks, setDecks] = useState<DeckWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [userStreak, setUserStreak] = useState<{ current: number; max: number } | null>(null);

  // UI States
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [editingDeck, setEditingDeck] = useState<{ id: string; name: string } | null>(null);

  const router = useRouter();
  const { isAdmin } = useUser();

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Apply filters
  const { filteredDecks, filterCounts } = useDeckFilters(
    decks,
    activeFilter,
    debouncedSearchQuery
  );

  // Fetch data on mount
  useEffect(() => {
    fetchDecks();
    fetchUserStreak();
  }, []);

  const fetchDecks = async () => {
    try {
      const response = await fetch('/api/decks');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch decks');
      }
      const data = await response.json();
      setDecks(data.decks);
    } catch (error) {
      console.error('Error fetching decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStreak = async () => {
    try {
      const response = await fetch('/api/stats/global');
      if (response.ok) {
        const data = await response.json();
        setUserStreak({
          current: data.currentStreak || 0,
          max: data.maxStreak || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCreateDeck = () => {
    setIsCreatingDeck(true);
  };

  const handleImportDeck = () => {
    router.push('/import');
  };

  const handleCreateSuccess = async (deck: { id: string; name: string }) => {
    await fetchDecks();
    router.push(`/deck/${deck.id}/add`);
  };

  const handleReview = (deckId: string) => {
    router.push(`/deck/${deckId}/review`);
  };

  const handleEdit = (deckId: string) => {
    router.push(`/deck/${deckId}/edit`);
  };

  const handleStudy = (deckId: string) => {
    router.push(`/deck/${deckId}/review?mode=study`);
  };

  const handleStats = (deckId: string) => {
    router.push(`/deck/${deckId}/stats`);
  };

  const handleSettings = (deckId: string) => {
    router.push(`/deck/${deckId}/settings`);
  };

  const handleQuickAdd = (deckId: string) => {
    router.push(`/deck/${deckId}/add`);
  };

  const handleRename = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    if (deck) {
      setEditingDeck({ id: deck.id, name: deck.name });
    }
  };

  const handleRenameSuccess = (newName: string) => {
    if (editingDeck) {
      setDecks(decks.map((d) => (d.id === editingDeck.id ? { ...d, name: newName } : d)));
    }
  };

  const handleExport = async (deckId: string, format: 'xml' | 'csv') => {
    try {
      const response = await fetch(`/api/decks/${deckId}/export?format=${format}`);

      if (!response.ok) {
        throw new Error('Failed to export deck');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : `deck.${format}`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting deck:', error);
      alert("Erreur lors de l'export du deck");
    }
  };

  const handleDelete = async (deckId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce deck ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/decks?id=${deckId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete deck');
      }

      setDecks(decks.filter((d) => d.id !== deckId));
    } catch (error) {
      console.error('Error deleting deck:', error);
      alert('Erreur lors de la suppression du deck');
    }
  };

  const handleResetStats = async (deckId: string) => {
    if (
      !confirm(
        'Voulez-vous réinitialiser toutes les statistiques de ce deck ? Cette action est irréversible.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deckId}/reset-stats`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset stats');
      }

      alert('Statistiques réinitialisées avec succès');
      await fetchDecks();
    } catch (error) {
      console.error('Error resetting stats:', error);
      alert('Erreur lors de la réinitialisation des statistiques');
    }
  };

  // Calculate total cards reviewed
  const totalCardsReviewed = decks.reduce(
    (sum, deck) => sum + (deck.totalReviews || 0),
    0
  );

  // Calculate total cards to review
  const cardsToReview = decks.reduce((sum, deck) => {
    if (deck.learningMethod === 'ANKI' && deck.ankiStats) {
      return sum + deck.ankiStats.due;
    }
    return sum;
  }, 0);

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  // Determine empty state type
  const showEmptyState = filteredDecks.length === 0;
  const emptyStateType: 'no-decks' | 'no-results' =
    decks.length === 0 ? 'no-decks' : 'no-results';

  return (
    <div
      className="min-h-screen pb-32 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"
      style={{ fontFamily: 'JetBrains Mono, monospace' }}
    >
      {/* Header */}
      <CompactHeader
        isAdmin={isAdmin}
        onCreateDeck={handleCreateDeck}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={true}
        currentStreak={userStreak?.current}
        maxStreak={userStreak?.max}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Stats Section */}
        <HeroStats
          currentStreak={userStreak?.current || 0}
          maxStreak={userStreak?.max || 0}
          totalDecks={decks.length}
          cardsToReview={cardsToReview}
          totalCardsReviewed={totalCardsReviewed}
        />

        {/* Quick Filters */}
        <QuickFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          dueDecksCount={filterCounts.due}
        />

        {/* Deck Grid or Empty State */}
        {showEmptyState ? (
          <EmptyState
            type={emptyStateType}
            searchQuery={debouncedSearchQuery}
            onCreateDeck={handleCreateDeck}
            onImportDeck={handleImportDeck}
            onClearSearch={() => setSearchQuery('')}
          />
        ) : (
          <DeckGrid
            decks={filteredDecks}
            onReview={handleReview}
            onEdit={handleEdit}
            onStudy={handleStudy}
            onStats={handleStats}
            onSettings={handleSettings}
            onResetStats={handleResetStats}
            onQuickAdd={handleQuickAdd}
            onRename={handleRename}
            onExport={handleExport}
            onDelete={handleDelete}
          />
        )}
      </main>

      {/* Modals */}
      {isCreatingDeck && (
        <CreateDeckModal
          isOpen={isCreatingDeck}
          onClose={() => setIsCreatingDeck(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingDeck && (
        <EditDeckNameModal
          isOpen={!!editingDeck}
          onClose={() => setEditingDeck(null)}
          deckId={editingDeck.id}
          currentName={editingDeck.name}
          onSuccess={handleRenameSuccess}
        />
      )}
    </div>
  );
}
