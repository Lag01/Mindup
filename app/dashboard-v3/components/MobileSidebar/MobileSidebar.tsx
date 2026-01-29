'use client'

import { useEffect } from 'react'
import UserProfile from '../Sidebar/UserProfile'
import Navigation from '../Sidebar/Navigation'
import QuickStats from '../Sidebar/QuickStats'
import QuickActions from '../Sidebar/QuickActions'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
  isAdmin?: boolean
  currentStreak: number
  maxStreak: number
  totalDecks: number
  dueCards: number
  reviewedCards: number
  onCreateDeck: () => void
  onImportDeck: () => void
  onLogout: () => void
}

export default function MobileSidebar({
  isOpen,
  onClose,
  userName,
  isAdmin,
  currentStreak,
  maxStreak,
  totalDecks,
  dueCards,
  reviewedCards,
  onCreateDeck,
  onImportDeck,
  onLogout,
}: MobileSidebarProps) {
  // Fermer au clic sur Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCreateDeck = () => {
    onCreateDeck()
    onClose()
  }

  const handleImportDeck = () => {
    onImportDeck()
    onClose()
  }

  const handleLogout = () => {
    onLogout()
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Sidebar slide from right */}
      <aside className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-zinc-900 z-50 lg:hidden animate-[slideInRight_0.3s_ease-out]">
        {/* Gradient border glow */}
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />

        {/* Content */}
        <div className="relative flex flex-col h-full p-6 gap-6 overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-all"
            aria-label="Fermer le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* User Profile */}
          <UserProfile
            userName={userName}
            currentStreak={currentStreak}
            maxStreak={maxStreak}
          />

          {/* Navigation */}
          <Navigation isAdmin={isAdmin} />

          {/* Quick Stats */}
          <QuickStats
            currentStreak={currentStreak}
            maxStreak={maxStreak}
            totalDecks={totalDecks}
            dueCards={dueCards}
            reviewedCards={reviewedCards}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Quick Actions */}
          <QuickActions onCreateDeck={handleCreateDeck} onImportDeck={handleImportDeck} />

          {/* Separator */}
          <div className="border-t border-zinc-800/50" />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-all group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  )
}
