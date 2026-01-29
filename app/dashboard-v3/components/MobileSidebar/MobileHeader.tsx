'use client'

import Logo from '@/components/Logo'

interface MobileHeaderProps {
  currentStreak: number
  onMenuClick: () => void
}

export default function MobileHeader({ currentStreak, onMenuClick }: MobileHeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800/50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Burger Menu */}
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center w-10 h-10 text-zinc-300 hover:text-cyan-400 hover:bg-zinc-800/50 rounded-lg transition-all group"
          aria-label="Ouvrir le menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
              className="transition-all group-hover:stroke-[2.5]"
            />
          </svg>
        </button>

        {/* Logo */}
        <Logo variant="icon" size={36} />

        {/* Streak Compact */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-600/90 to-red-600/90 rounded-md">
          <span className="text-base animate-pulse">🔥</span>
          <span className="text-sm font-bold text-white tabular-nums">
            {currentStreak}j
          </span>
        </div>
      </div>
    </header>
  )
}
