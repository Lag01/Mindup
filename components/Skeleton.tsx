/**
 * Composants Skeleton pour loading states
 * Améliore l'UX en montrant des placeholders pendant le chargement
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton générique
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-zinc-800 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton pour une carte de deck dans le dashboard
 */
export function SkeletonDeckCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>

      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </div>
    </div>
  );
}

/**
 * Skeleton pour une carte (flashcard) dans edit/review
 */
export function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>

      <div className="space-y-2 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      <div className="border-t border-zinc-800 pt-3 mt-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour les statistiques
 */
export function SkeletonStats() {
  return (
    <div className="space-y-6">
      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Graphique */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>

      {/* Détails */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour la liste de decks (dashboard)
 */
export function SkeletonDeckList({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <SkeletonDeckCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton pour la liste de cartes (edit)
 */
export function SkeletonCardList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton pour le leaderboard
 */
export function SkeletonLeaderboard() {
  return (
    <div className="space-y-2">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4"
        >
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-5 w-32 flex-1" />
          <Skeleton className="h-6 w-16 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
