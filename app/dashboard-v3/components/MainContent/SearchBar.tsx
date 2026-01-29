'use client'

import { useState, useEffect } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher un deck...',
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleClear = () => {
    onChange('')
  }

  return (
    <div className="relative">
      {/* Glow effect when focused */}
      {isFocused && (
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-xl" />
      )}

      <div
        className={`relative flex items-center gap-3 px-4 py-3 bg-zinc-900/50 backdrop-blur-md rounded-xl border transition-all ${
          isFocused
            ? 'border-cyan-500/50 ring-2 ring-cyan-500/20'
            : 'border-zinc-800/50 hover:border-zinc-700/50'
        }`}
      >
        {/* Icône loupe */}
        <svg
          className={`w-5 h-5 transition-colors ${isFocused ? 'text-cyan-400' : 'text-zinc-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none"
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center w-6 h-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-md transition-all"
            aria-label="Effacer la recherche"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Corner accent */}
      <div className="absolute top-2 left-2 w-1 h-1 bg-cyan-500/50 rounded-full" />
    </div>
  )
}
