'use client'

interface QuickActionsProps {
  onCreateDeck: () => void
  onImportDeck: () => void
}

export default function QuickActions({ onCreateDeck, onImportDeck }: QuickActionsProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <h3 className="text-xs text-zinc-500 uppercase tracking-wider font-bold px-2">
        Actions Rapides
      </h3>

      {/* Boutons */}
      <div className="space-y-2">
        {/* Créer un deck */}
        <button
          onClick={onCreateDeck}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Créer un deck</span>
        </button>

        {/* Importer un deck */}
        <button
          onClick={onImportDeck}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>Importer un deck</span>
        </button>
      </div>
    </div>
  )
}
