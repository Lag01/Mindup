'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MathText from '@/components/MathText';
import { insertCardInQueue, Rating } from '@/lib/revision';

interface Card {
  id: string;
  front: string;
  back: string;
  frontType: 'TEXT' | 'LATEX';
  backType: 'TEXT' | 'LATEX';
  review: any;
}

interface SessionState {
  cardQueue: Card[];
  currentCardId: string | null;
  sessionStats: {
    total: number;
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

// Hook to detect mobile screen size
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Functions to manage session state in localStorage
function getSessionKey(deckId: string): string {
  return `review-session-${deckId}`;
}

function saveSessionState(deckId: string, state: SessionState): void {
  try {
    localStorage.setItem(getSessionKey(deckId), JSON.stringify(state));
  } catch (error) {
    console.error('Error saving session state:', error);
  }
}

function loadSessionState(deckId: string): SessionState | null {
  try {
    const saved = localStorage.getItem(getSessionKey(deckId));
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading session state:', error);
  }
  return null;
}

function clearSessionState(deckId: string): void {
  try {
    localStorage.removeItem(getSessionKey(deckId));
  } catch (error) {
    console.error('Error clearing session state:', error);
  }
}

export default function Review() {
  const params = useParams();
  const deckId = params.id as string;
  const [allCards, setAllCards] = useState<Card[]>([]); // All cards from the deck
  const [cardQueue, setCardQueue] = useState<Card[]>([]); // Dynamic queue of cards
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total: 0, again: 0, hard: 0, good: 0, easy: 0 });
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchCards();
  }, [deckId]);

  const fetchCards = async () => {
    try {
      // Check if there's a saved session
      const savedSession = loadSessionState(deckId);

      const response = await fetch(`/api/review?deckId=${deckId}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch cards');
      }
      const data = await response.json();
      setAllCards(data.cards);

      // Restore session if it exists, otherwise start fresh
      if (savedSession && savedSession.cardQueue.length > 0) {
        // Restore the saved queue and stats
        setCardQueue(savedSession.cardQueue);
        setSessionStats(savedSession.sessionStats);

        // Find the current card from the saved queue
        const currentCardFromSaved = savedSession.cardQueue.find(
          card => card.id === savedSession.currentCardId
        );
        setCurrentCard(currentCardFromSaved || savedSession.cardQueue[0]);
      } else {
        // Initialize the queue with all cards
        setCardQueue(data.cards);

        // Set the first card as current
        if (data.cards.length > 0) {
          setCurrentCard(data.cards[0]);
        }
      }
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
    if (submitting || !currentCard) return;

    setSubmitting(true);

    try {
      // Submit review to API
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      // Update session stats
      const updatedStats = {
        total: sessionStats.total + 1,
        again: sessionStats.again + (rating === 'again' ? 1 : 0),
        hard: sessionStats.hard + (rating === 'hard' ? 1 : 0),
        good: sessionStats.good + (rating === 'good' ? 1 : 0),
        easy: sessionStats.easy + (rating === 'easy' ? 1 : 0),
      };
      setSessionStats(updatedStats);

      // Remove current card from queue
      const remainingQueue = cardQueue.slice(1);

      // Reinsert the card at the appropriate position based on rating
      const newQueue = insertCardInQueue(remainingQueue, currentCard, rating as Rating);

      // If queue becomes empty, restart with all cards and clear session
      if (newQueue.length === 0) {
        setCardQueue(allCards);
        setCurrentCard(allCards[0]);
        // Clear saved session when all cards are done
        clearSessionState(deckId);
      } else {
        setCardQueue(newQueue);
        setCurrentCard(newQueue[0]);

        // Save session state after each card
        saveSessionState(deckId, {
          cardQueue: newQueue,
          currentCardId: newQueue[0].id,
          sessionStats: updatedStats,
        });
      }

      // Reset flip state for next card
      setIsFlipped(false);
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

  if (allCards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">
            Aucune carte dans ce deck
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

  if (!currentCard) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-zinc-400 text-sm">
              Session continue • {sessionStats.total} cartes révisées
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Quitter
            </button>
          </div>
        </div>
      </header>

      {/* Card Display Area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="bg-zinc-900 rounded-lg p-6 md:p-8 border border-zinc-800 min-h-[300px] md:min-h-[400px] flex flex-col justify-center">
            {!isFlipped ? (
              // Front of card
              <div className="text-center">
                <MathText
                  text={currentCard.front}
                  contentType={currentCard.frontType}
                  className="text-xl md:text-2xl text-foreground"
                  autoResize={true}
                  maxHeight={isMobile ? 450 : 600}
                />
              </div>
            ) : (
              // Both sides of card
              <div className="space-y-4 md:space-y-6">
                <div className="text-center">
                  <MathText
                    text={currentCard.front}
                    contentType={currentCard.frontType}
                    className="text-lg md:text-xl text-zinc-400"
                    autoResize={true}
                    maxHeight={isMobile ? 180 : 250}
                  />
                </div>
                <div className="border-t border-zinc-700"></div>
                <div className="text-center">
                  <MathText
                    text={currentCard.back}
                    contentType={currentCard.backType}
                    className="text-xl md:text-2xl text-foreground"
                    autoResize={true}
                    maxHeight={isMobile ? 280 : 350}
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
