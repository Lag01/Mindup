'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

interface CompactHeaderProps {
  isAdmin: boolean;
  onCreateDeck: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSearch?: boolean;
  currentStreak?: number;
  maxStreak?: number;
}

export default function CompactHeader({
  isAdmin,
  onCreateDeck,
  onLogout,
  searchQuery,
  onSearchChange,
  showSearch = true,
  currentStreak,
  maxStreak,
}: CompactHeaderProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStreakExpanded, setIsStreakExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-expand search si query existe
  useEffect(() => {
    if (searchQuery && !isSearchExpanded) {
      setIsSearchExpanded(true);
    }
  }, [searchQuery, isSearchExpanded]);

  // Focus sur input quand search expand
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Fermer les menus avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateMenuOpen(false);
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
        if (!searchQuery && isSearchExpanded) {
          setIsSearchExpanded(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [searchQuery, isSearchExpanded]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/50 backdrop-blur-md bg-zinc-900/80">
      {/* Subtle glow effect sur le border */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop Layout - Single Line */}
        <div className="hidden md:flex items-center gap-3 h-16">
          {/* Logo */}
          <div className="flex-shrink-0 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
            <Logo variant="icon" size={40} />
          </div>

          {/* Search Bar - Expandable */}
          {showSearch && (
            <div
              className="relative flex-shrink-0 opacity-0 animate-[fadeIn_0.5s_ease-out_0.1s_forwards]"
              style={{ width: isSearchExpanded ? '320px' : '180px' }}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-cyan-400/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isSearchExpanded ? "Rechercher un deck..." : "Search..."}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => {
                  if (!searchQuery) {
                    setIsSearchExpanded(false);
                  }
                }}
                className="w-full pl-10 pr-9 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 font-mono"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-cyan-400 transition-colors"
                  aria-label="Effacer la recherche"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2 opacity-0 animate-[fadeIn_0.5s_ease-out_0.2s_forwards]">
            {/* Dropdown Créer */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsCreateMenuOpen(!isCreateMenuOpen);
                  setIsProfileMenuOpen(false);
                }}
                className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-cyan-500/50 rounded-md text-zinc-300 hover:text-cyan-400 text-sm font-medium transition-all duration-200 flex items-center gap-1.5 group"
                aria-label="Menu créer"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span className="text-cyan-400 group-hover:scale-110 transition-transform">+</span>
                Créer
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${isCreateMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isCreateMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsCreateMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/50 rounded-lg shadow-2xl z-20 overflow-hidden animate-[slideDown_0.2s_ease-out]">
                    <button
                      onClick={() => {
                        onCreateDeck();
                        setIsCreateMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-150 flex items-center gap-3 border-b border-zinc-700/30"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      <span className="text-lg">➕</span>
                      <span className="text-sm">Créer un deck</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/import');
                        setIsCreateMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-150 flex items-center gap-3 border-b border-zinc-700/30"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      <span className="text-lg">📥</span>
                      <span className="text-sm">Importer un deck</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/public-decks');
                        setIsCreateMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-150 flex items-center gap-3"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      <span className="text-lg">🌐</span>
                      <span className="text-sm">Decks Publics</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Classement */}
            <button
              onClick={() => router.push('/leaderboard')}
              className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-orange-500/50 rounded-md text-zinc-300 hover:text-orange-400 text-sm font-medium transition-all duration-200"
              aria-label="Classement"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Classement
            </button>

            {/* Math */}
            <button
              onClick={() => router.push('/veryfastmath')}
              className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-yellow-500/50 rounded-md text-zinc-300 hover:text-yellow-400 text-sm font-medium transition-all duration-200 whitespace-nowrap"
              aria-label="Défis VeryFastMath"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Math
            </button>

            {/* Admin */}
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-purple-500/50 rounded-md text-zinc-300 hover:text-purple-400 text-sm font-medium transition-all duration-200"
                aria-label="Administration"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Admin
              </button>
            )}

            {/* Streak Badge */}
            {currentStreak !== undefined && (
              <div
                className="relative"
                onMouseEnter={() => setIsStreakExpanded(true)}
                onMouseLeave={() => setIsStreakExpanded(false)}
              >
                <div className="px-3 py-1.5 bg-gradient-to-r from-orange-600/90 to-red-600/90 rounded-md flex items-center gap-2 shadow-lg cursor-default transition-all duration-300 hover:shadow-orange-500/50"
                  style={{
                    boxShadow: isStreakExpanded
                      ? '0 0 20px rgba(249, 115, 22, 0.4)'
                      : '0 0 10px rgba(249, 115, 22, 0.2)'
                  }}
                >
                  <span className="text-lg animate-[pulse_2s_ease-in-out_infinite]">🔥</span>
                  <span className="text-white font-bold text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {currentStreak}j
                  </span>
                </div>

                {/* Expanded Streak Info */}
                {isStreakExpanded && maxStreak !== undefined && (
                  <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-zinc-800/95 backdrop-blur-md border border-orange-500/30 rounded-md shadow-xl whitespace-nowrap animate-[slideDown_0.2s_ease-out]">
                    <div className="text-xs text-orange-400 font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      Record: {maxStreak} jours
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                  setIsCreateMenuOpen(false);
                }}
                className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-cyan-500/50 rounded-md text-zinc-300 hover:text-cyan-400 transition-all duration-200"
                aria-label="Menu profil"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/50 rounded-lg shadow-2xl z-20 overflow-hidden animate-[slideDown_0.2s_ease-out]">
                    <button
                      onClick={() => {
                        onLogout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 transition-all duration-150 flex items-center gap-3"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="text-sm">Déconnexion</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <Logo variant="icon" size={36} />
            </div>

            {/* Streak Mobile */}
            {currentStreak !== undefined && (
              <div className="px-2.5 py-1 bg-gradient-to-r from-orange-600/90 to-red-600/90 rounded-md flex items-center gap-1.5 shadow-lg opacity-0 animate-[fadeIn_0.5s_ease-out_0.1s_forwards]">
                <span className="text-base">🔥</span>
                <span className="text-white font-bold text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {currentStreak}j
                </span>
              </div>
            )}

            {/* Burger Menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-cyan-500/50 text-zinc-300 hover:text-cyan-400 transition-all duration-200 opacity-0 animate-[fadeIn_0.5s_ease-out_0.2s_forwards]"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Search */}
          {showSearch && (
            <div className="relative opacity-0 animate-[fadeIn_0.5s_ease-out_0.3s_forwards]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-cyan-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Rechercher un deck..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-cyan-400 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="mt-3 bg-zinc-800/50 backdrop-blur-md border border-zinc-700/50 rounded-lg p-2 flex flex-col gap-1.5 animate-[slideDown_0.2s_ease-out]">
              <button
                onClick={() => {
                  onCreateDeck();
                  setIsMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2.5 text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-md transition-all text-sm flex items-center gap-2"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span>➕</span> Créer un deck
              </button>
              <button
                onClick={() => {
                  router.push('/import');
                  setIsMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2.5 text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-md transition-all text-sm flex items-center gap-2"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span>📥</span> Importer un deck
              </button>
              <button
                onClick={() => {
                  router.push('/public-decks');
                  setIsMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2.5 text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-md transition-all text-sm flex items-center gap-2"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span>🌐</span> Decks Publics
              </button>
              <div className="h-px bg-zinc-700/50 my-1" />
              <button
                onClick={() => {
                  router.push('/leaderboard');
                  setIsMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2.5 text-zinc-300 hover:bg-orange-500/10 hover:text-orange-400 rounded-md transition-all text-sm"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Classement
              </button>
              <button
                onClick={() => {
                  router.push('/veryfastmath');
                  setIsMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2.5 text-zinc-300 hover:bg-yellow-500/10 hover:text-yellow-400 rounded-md transition-all text-sm"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Défis VeryFastMath
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    router.push('/admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2.5 text-zinc-300 hover:bg-purple-500/10 hover:text-purple-400 rounded-md transition-all text-sm"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Administration
                </button>
              )}
              <div className="h-px bg-zinc-700/50 my-1" />
              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-md transition-all text-sm"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
}
