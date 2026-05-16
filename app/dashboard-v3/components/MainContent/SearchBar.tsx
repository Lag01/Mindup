'use client'

import { useState } from 'react'

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
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-zinc-800 rounded-lg border transition-colors ${
        isFocused
          ? 'border-transparent ring-2 ring-blue-500'
          : 'border-zinc-700 hover:border-zinc-600'
      }`}
    >
      {/* Icône loupe */}
      <svg
        className={`w-5 h-5 transition-colors ${isFocused ? 'text-blue-400' : 'text-zinc-500'}`}
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
          className="flex items-center justify-center w-6 h-6 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-md transition-colors"
          aria-label="Effacer la recherche"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
