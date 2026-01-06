'use client';

import { useState } from 'react';
import Logo from './Logo';
import { useRouter } from 'next/navigation';

interface DashboardHeaderProps {
  isAdmin: boolean;
  onCreateDeck: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSearch?: boolean;
  currentStreak?: number;
  maxStreak?: number;
}

export default function DashboardHeader({
  isAdmin,
  onCreateDeck,
  onLogout,
  searchQuery,
  onSearchChange,
  showSearch = true,
  currentStreak,
  maxStreak,
}: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <header className="bg-zinc-900 border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          {/* Logo + Titre + Streak */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <Logo variant="icon" size={48} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Mes Decks
            </h1>
            {/* Version mobile ultra-compacte */}
            {currentStreak !== undefined && (
              <div className="sm:hidden flex-shrink-0">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 px-2 py-1 rounded-md flex items-center gap-1">
                  <span className="text-lg">🔥</span>
                  <span className="text-white font-bold text-sm">{currentStreak}j</span>
                </div>
              </div>
            )}

            {/* Version tablette compacte */}
            {currentStreak !== undefined && (
              <div className="hidden sm:flex md:hidden flex-shrink-0">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span className="text-xl">🔥</span>
                  <span className="text-white font-bold text-base">{currentStreak} jours</span>
                </div>
              </div>
            )}

            {/* Version desktop complète */}
            {currentStreak !== undefined && (
              <div className="hidden md:flex items-center gap-2">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-orange-500/30">
                  <span className="text-2xl">🔥</span>
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-lg">{currentStreak} jours</span>
                    <span className="text-orange-200 text-xs">
                      Record : {maxStreak} jours
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Boutons desktop (cachés sur mobile) */}
          <div className="hidden md:flex gap-2">
            {/* Nouveau dropdown Créer/Importer/Decks Publics */}
            <div className="relative">
              <button
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <span className="text-lg">+</span> Créer / Importer
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isCreateMenuOpen && (
                <>
                  {/* Overlay */}
                  <div className="fixed inset-0 z-10" onClick={() => setIsCreateMenuOpen(false)} />

                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                    <button
                      onClick={() => {
                        onCreateDeck();
                        setIsCreateMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-green-700/30 transition-colors flex items-center gap-3"
                    >
                      <span className="text-xl">➕</span>
                      <span>Créer un deck</span>
                    </button>

                    <div className="border-t border-zinc-700"></div>

                    <button
                      onClick={() => {
                        router.push('/import');
                        setIsCreateMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-indigo-700/30 transition-colors flex items-center gap-3"
                    >
                      <span className="text-xl">📥</span>
                      <span>Importer un deck</span>
                    </button>

                    <div className="border-t border-zinc-700"></div>

                    <button
                      onClick={() => {
                        router.push('/public-decks');
                        setIsCreateMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-blue-700/30 transition-colors flex items-center gap-3"
                    >
                      <span className="text-xl">🌐</span>
                      <span>Decks Publics</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => router.push('/leaderboard')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              Classement
            </button>
            <button
              onClick={() => router.push('/veryfastmath')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              Défis VeryFastMath
            </button>
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Administration
              </button>
            )}
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              Déconnexion
            </button>
          </div>

          {/* Bouton burger (mobile uniquement) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Menu déroulant mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden mb-4 bg-zinc-800 rounded-lg p-3 flex flex-col gap-2">
            <button
              onClick={() => {
                router.push('/public-decks');
                setIsMobileMenuOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left"
            >
              Decks Publics
            </button>
            <button
              onClick={() => {
                router.push('/leaderboard');
                setIsMobileMenuOpen(false);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left"
            >
              Classement
            </button>
            <button
              onClick={() => {
                router.push('/veryfastmath');
                setIsMobileMenuOpen(false);
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left"
            >
              Défis VeryFastMath
            </button>
            <button
              onClick={() => {
                onCreateDeck();
                setIsMobileMenuOpen(false);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
            >
              <span className="text-lg">+</span> Créer un deck
            </button>
            <button
              onClick={() => {
                router.push('/import');
                setIsMobileMenuOpen(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left"
            >
              Importer un deck
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  router.push('/admin');
                  setIsMobileMenuOpen(false);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left"
              >
                Administration
              </button>
            )}
            <button
              onClick={() => {
                onLogout();
                setIsMobileMenuOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left"
            >
              Déconnexion
            </button>
          </div>
        )}

        {/* Barre de recherche */}
        {showSearch && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-zinc-400"
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
              type="text"
              placeholder="Rechercher un deck..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
