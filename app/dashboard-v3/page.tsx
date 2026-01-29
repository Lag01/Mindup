'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useDebounce } from '@/hooks/useDebounce'
import { DeckWithStats } from '@/lib/types'
import LoadingAnimation from '@/components/LoadingAnimation'
import CreateDeckModal from '@/components/CreateDeckModal'
import EditDeckNameModal from '@/components/EditDeckNameModal'

import Sidebar from './components/Sidebar/Sidebar'
import MobileHeader from './components/MobileSidebar/MobileHeader'
import MobileSidebar from './components/MobileSidebar/MobileSidebar'
import SearchBar from './components/MainContent/SearchBar'
import QuickFilters from './components/MainContent/QuickFilters'
import DeckGrid from './components/MainContent/DeckGrid'
import EmptyState from './components/MainContent/EmptyState'
import { useDeckFilters, FilterType } from './hooks/useDeckFilters'

interface UserStreak {
  current: number
  max: number
}

export default function DashboardV3Page() {
  const router = useRouter()
  const { isAdmin } = useUser()

  // États données
  const [decks, setDecks] = useState<DeckWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null)

  // États UI
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [editingDeck, setEditingDeck] = useState<{ id: string; name: string } | null>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Debounce de la recherche
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Filtrage des decks
  const { filteredDecks, filterCounts } = useDeckFilters(decks, activeFilter, debouncedSearchQuery)

  // Calcul des statistiques
  const totalDueCards = useMemo(() => {
    if (!Array.isArray(decks)) return 0
    return decks.reduce((sum, deck) => sum + (deck.ankiStats?.due ?? 0), 0)
  }, [decks])

  const totalReviewedCards = useMemo(() => {
    if (!Array.isArray(decks)) return 0
    return decks.reduce((sum, deck) => sum + (deck.totalReviews ?? 0), 0)
  }, [decks])

  // Chargement initial des données
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch decks et streak en parallèle
        const [decksRes, streakRes] = await Promise.all([
          fetch('/api/decks'),
          fetch('/api/stats/global'),
        ])

        if (!decksRes.ok) throw new Error('Erreur lors du chargement des decks')

        const decksData = await decksRes.json()
        // Vérifier que decksData est bien un tableau
        setDecks(Array.isArray(decksData) ? decksData : [])

        if (streakRes.ok) {
          const streakData = await streakRes.json()
          setUserStreak({
            current: streakData.currentStreak ?? 0,
            max: streakData.maxStreak ?? 0,
          })
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handlers
  const handleCreateDeck = useCallback(() => {
    setIsCreatingDeck(true)
  }, [])

  const handleImportDeck = useCallback(() => {
    router.push('/import')
  }, [router])

  const handleDeckCreated = useCallback(
    (deckId: string) => {
      router.push(`/deck/${deckId}/add`)
    },
    [router]
  )

  const handleReview = useCallback(
    (deckId: string) => {
      router.push(`/deck/${deckId}/review`)
    },
    [router]
  )

  const handleEdit = useCallback(
    (deckId: string) => {
      router.push(`/deck/${deckId}/edit`)
    },
    [router]
  )

  const handleStudy = useCallback(
    (deckId: string) => {
      router.push(`/deck/${deckId}/study`)
    },
    [router]
  )

  const handleStats = useCallback(
    (deckId: string) => {
      router.push(`/deck/${deckId}/stats`)
    },
    [router]
  )

  const handleSettings = useCallback(
    (deckId: string) => {
      router.push(`/deck/${deckId}/settings`)
    },
    [router]
  )

  const handleQuickAdd = useCallback(
    (deckId: string) => {
      router.push(`/deck/${deckId}/add`)
    },
    [router]
  )

  const handleRename = useCallback((deckId: string) => {
    const deck = decks.find((d) => d.id === deckId)
    if (deck) {
      setEditingDeck({ id: deck.id, name: deck.name })
    }
  }, [decks])

  const handleDeckRenamed = useCallback(async (deckId: string, newName: string) => {
    setDecks((prev) => prev.map((d) => (d.id === deckId ? { ...d, name: newName } : d)))
    setEditingDeck(null)
  }, [])

  const handleResetStats = useCallback(async (deckId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser les statistiques de ce deck ?')) {
      return
    }

    try {
      const response = await fetch(`/api/decks/${deckId}/reset-stats`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Erreur lors de la réinitialisation')

      // Recharger les decks
      const decksRes = await fetch('/api/decks')
      if (decksRes.ok) {
        const decksData = await decksRes.json()
        setDecks(decksData)
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la réinitialisation des statistiques')
    }
  }, [])

  const handleExport = useCallback(async (deckId: string, format: 'xml' | 'csv') => {
    try {
      const response = await fetch(`/api/decks/${deckId}/export?format=${format}`)
      if (!response.ok) throw new Error('Erreur lors de l\'export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deck-${deckId}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'export du deck')
    }
  }, [])

  const handleDelete = useCallback(async (deckId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce deck ?')) {
      return
    }

    try {
      const response = await fetch(`/api/decks?id=${deckId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      setDecks((prev) => prev.filter((d) => d.id !== deckId))
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la suppression du deck')
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (response.ok) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
    }
  }, [router])

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    )
  }

  const showEmptyState = filteredDecks.length === 0 && decks.length === 0 && !debouncedSearchQuery

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Mobile Header */}
      <MobileHeader
        currentStreak={userStreak?.current ?? 0}
        onMenuClick={() => setIsMobileSidebarOpen(true)}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        isAdmin={isAdmin}
        currentStreak={userStreak?.current ?? 0}
        maxStreak={userStreak?.max ?? 0}
        totalDecks={decks.length}
        dueCards={totalDueCards}
        reviewedCards={totalReviewedCards}
        onCreateDeck={handleCreateDeck}
        onImportDeck={handleImportDeck}
        onLogout={handleLogout}
      />

      {/* Desktop Sidebar */}
      <Sidebar
        isAdmin={isAdmin}
        currentStreak={userStreak?.current ?? 0}
        maxStreak={userStreak?.max ?? 0}
        totalDecks={decks.length}
        dueCards={totalDueCards}
        reviewedCards={totalReviewedCards}
        onCreateDeck={handleCreateDeck}
        onImportDeck={handleImportDeck}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="lg:mr-80 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Recherche */}
          <div className="mb-6">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Filtres */}
          <QuickFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            dueDecksCount={filterCounts.due}
          />

          {/* Grille ou Empty State */}
          {showEmptyState ? (
            <EmptyState
              type="no-decks"
              onCreateDeck={handleCreateDeck}
              onImportDeck={handleImportDeck}
            />
          ) : filteredDecks.length === 0 ? (
            <EmptyState
              type="no-results"
              searchQuery={debouncedSearchQuery}
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
        </div>
      </main>

      {/* Modals */}
      <CreateDeckModal
        isOpen={isCreatingDeck}
        onClose={() => setIsCreatingDeck(false)}
        onSuccess={(deck) => handleDeckCreated(deck.id)}
      />

      <EditDeckNameModal
        isOpen={!!editingDeck}
        deckId={editingDeck?.id ?? ''}
        currentName={editingDeck?.name ?? ''}
        onClose={() => setEditingDeck(null)}
        onSuccess={(newName) => {
          if (editingDeck) {
            handleDeckRenamed(editingDeck.id, newName)
          }
        }}
      />
    </div>
  )
}
