'use client'

import UserProfile from './UserProfile'
import Navigation from './Navigation'
import QuickStats from './QuickStats'
import QuickActions from './QuickActions'
import { useState } from 'react'

interface SidebarProps {
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

export default function Sidebar({
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
}: SidebarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await onLogout()
  }

  return (
    <aside className="hidden lg:block fixed right-0 top-0 h-screen w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800/50 z-30">
      {/* Gradient border glow */}
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />

      {/* Scanline effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Content */}
      <div className="relative flex flex-col h-full p-6 gap-6 overflow-y-auto">
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
        <QuickActions onCreateDeck={onCreateDeck} onImportDeck={onImportDeck} />

        {/* Separator */}
        <div className="border-t border-zinc-800/50" />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isLoggingOut ? 'animate-pulse' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="font-medium">
            {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
          </span>
        </button>
      </div>
    </aside>
  )
}
