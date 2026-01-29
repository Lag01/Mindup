'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface NavigationItem {
  label: string
  href: string
  icon: ReactNode
  adminOnly?: boolean
}

interface NavigationProps {
  isAdmin?: boolean
}

export default function Navigation({ isAdmin = false }: NavigationProps) {
  const pathname = usePathname()

  const navigationItems: NavigationItem[] = [
    {
      label: 'Mes Decks',
      href: '/dashboard-v3',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: 'Decks Publics',
      href: '/public-decks',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      label: 'Classement',
      href: '/leaderboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'VeryFastMath',
      href: '/veryfastmath',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ]

  if (isAdmin) {
    navigationItems.push({
      label: 'Administration',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      adminOnly: true,
    })
  }

  return (
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              relative flex items-center gap-3 px-4 py-2 rounded-lg
              transition-all duration-200 group
              ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500'
                  : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-cyan-400 border-l-2 border-transparent'
              }
            `}
          >
            {/* Icône */}
            <div className={`transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>
              {item.icon}
            </div>

            {/* Label */}
            <span className="font-medium">
              {item.label}
            </span>

            {/* Badge admin */}
            {item.adminOnly && (
              <span className="ml-auto px-2 py-0.5 text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded">
                ADMIN
              </span>
            )}

            {/* Glow effect au hover */}
            {!isActive && (
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
