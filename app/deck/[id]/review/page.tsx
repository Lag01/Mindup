'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MathText from '@/components/MathText';

interface Card {
  id: string;
  front: string;
  back: string;
  review: any;
}

export default function Review() {
  const params = useParams();
  const deckId = params.id as string;
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCards();
  }, [deckId]);

  const fetchCards = async () => {
    try {
      const response = await fetch(`/api/review?deckId=${deckId}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch cards');
      }
      const data = await response.json();
      setCards(data.cards);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (submitting) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: cards[currentIndex].id,
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        // All cards reviewed
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Erreur lors de la soumission de la révision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground text-lg">Chargement...</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">
            Aucune carte à réviser pour le moment
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-zinc-400 text-sm">
            Carte {currentIndex + 1} / {cards.length}
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Quitter
          </button>
        </div>
      </header>

      {/* Card Display Area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="bg-zinc-900 rounded-lg p-8 border border-zinc-800 min-h-[400px] flex flex-col justify-center">
            {!isFlipped ? (
              // Front of card
              <div className="text-center">
                <MathText
                  text={currentCard.front}
                  className="text-2xl text-foreground"
                />
              </div>
            ) : (
              // Both sides of card
              <div className="space-y-6">
                <div className="text-center">
                  <MathText
                    text={currentCard.front}
                    className="text-xl text-zinc-400"
                  />
                </div>
                <div className="border-t border-zinc-700"></div>
                <div className="text-center">
                  <MathText
                    text={currentCard.back}
                    className="text-2xl text-foreground"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {!isFlipped ? (
            // Flip button
            <button
              onClick={handleFlip}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-4 rounded-lg transition-colors text-lg"
            >
              Retourner
            </button>
          ) : (
            // Rating buttons
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                onClick={() => handleRating('again')}
                disabled={submitting}
                className="bg-red-900/30 hover:bg-red-900/50 text-red-400 font-medium py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Échec
              </button>
              <button
                onClick={() => handleRating('hard')}
                disabled={submitting}
                className="bg-orange-900/30 hover:bg-orange-900/50 text-orange-400 font-medium py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Difficile
              </button>
              <button
                onClick={() => handleRating('good')}
                disabled={submitting}
                className="bg-green-900/30 hover:bg-green-900/50 text-green-400 font-medium py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bon
              </button>
              <button
                onClick={() => handleRating('easy')}
                disabled={submitting}
                className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 font-medium py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Facile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
