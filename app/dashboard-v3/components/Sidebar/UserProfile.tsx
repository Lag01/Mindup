'use client'

import { useEffect, useState } from 'react'

interface UserProfileProps {
  userName?: string
  currentStreak: number
  maxStreak: number
}

export default function UserProfile({ userName, currentStreak, maxStreak }: UserProfileProps) {
  const [showRecord, setShowRecord] = useState(false)

  // Initiales pour l'avatar
  const initials = userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className="relative">
      {/* Gradient border glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl blur-sm" />

      <div className="relative bg-zinc-800/50 backdrop-blur-md rounded-xl p-3 border border-zinc-700/50">
        <div className="flex items-center gap-3">
          {/* Avatar avec initiales */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            {/* Indicateur en ligne (LED) */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-zinc-800 animate-pulse" />
          </div>

          {/* Info utilisateur */}
          <div className="flex-1 min-w-0">
            <h3 className="text-zinc-100 font-medium truncate">
              {userName || 'Utilisateur'}
            </h3>

            {/* Badge streak avec animation */}
            <div
              className="relative inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 bg-gradient-to-r from-orange-600/90 to-red-600/90 rounded-md cursor-pointer transition-transform hover:scale-105"
              onMouseEnter={() => setShowRecord(true)}
              onMouseLeave={() => setShowRecord(false)}
            >
              <span className="text-base animate-pulse">🔥</span>
              <span className="text-sm font-bold text-white tabular-nums">
                {currentStreak}j
              </span>

              {/* Tooltip record au hover */}
              {showRecord && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-900 border border-orange-500/30 rounded-lg whitespace-nowrap animate-[fadeIn_0.2s_ease-out]">
                  <div className="text-xs text-zinc-400">Record</div>
                  <div className="text-sm font-bold text-orange-400 tabular-nums">
                    {maxStreak}j
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-zinc-900 border-r border-b border-orange-500/30 rotate-45" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
