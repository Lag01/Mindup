'use client';

import { useState } from 'react';

interface DashboardFeedbackModalProps {
  isOpen: boolean;
  onSubmit: (rating: number, switchBack: boolean) => Promise<void>;
  onClose: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Pas satisfait',
  2: 'Décevant',
  3: 'Correct',
  4: 'Bien',
  5: 'Excellent !',
};

export default function DashboardFeedbackModal({
  isOpen,
  onSubmit,
  onClose,
}: DashboardFeedbackModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [switchBack, setSwitchBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mettre à jour la checkbox automatiquement selon la note
  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    // Pré-cocher "Revenir" si note <= 2
    if (newRating <= 2) {
      setSwitchBack(true);
    }
  };

  const handleSubmit = async () => {
    if (rating === null) return;

    setIsSubmitting(true);
    try {
      await onSubmit(rating, switchBack);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, starRating: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRatingChange(starRating);
    }
  };

  if (!isOpen) return null;

  const displayRating = hoveredRating || rating || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md border border-zinc-800">
        <h2 className="text-xl font-bold text-foreground mb-2">
          Votre avis sur la nouvelle version ?
        </h2>
        <p className="text-zinc-400 text-sm mb-6">
          Vous utilisez la nouvelle version depuis 3 jours, qu'en pensez-vous ?
        </p>

        {/* Système d'étoiles */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingChange(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                onKeyDown={(e) => handleKeyDown(e, star)}
                className="focus:outline-none focus:ring-2 focus:ring-blue-600 rounded"
                aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
              >
                <svg
                  className={`w-10 h-10 transition-colors ${
                    star <= displayRating
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-zinc-600 fill-zinc-600'
                  } hover:text-yellow-400 hover:fill-yellow-400`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </button>
            ))}
          </div>

          {/* Label de la note */}
          {displayRating > 0 && (
            <p className="text-center text-sm font-medium text-foreground">
              {RATING_LABELS[displayRating]}
            </p>
          )}
        </div>

        {/* Checkbox pour revenir à v1 */}
        <label className="flex items-center gap-3 bg-zinc-800 p-4 rounded-lg border border-zinc-700 mb-6 cursor-pointer hover:bg-zinc-750 transition-colors">
          <input
            type="checkbox"
            checked={switchBack}
            onChange={(e) => setSwitchBack(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-600 focus:ring-2"
          />
          <span className="text-sm text-zinc-300">
            Revenir à l'ancienne version
          </span>
        </label>

        {/* Boutons d'action */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === null || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
