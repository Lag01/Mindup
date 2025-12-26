'use client';

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import MathText from '@/components/MathText';
import CardContentDisplay from '@/components/CardContentDisplay';
import ImageOverlay from '@/components/ImageOverlay';
import LoadingAnimation from '@/components/LoadingAnimation';
import { insertCardInQueue, Rating } from '@/lib/revision';
import { Card, SessionState } from '@/lib/types';
import { useIsMobile } from '@/hooks/useIsMobile';

// Fonction pour mélanger aléatoirement un tableau (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Composant pour afficher une carte (mémorisé pour éviter re-renders)
const CardDisplay = memo(({
  card,
  isFlipped,
  isMobile,
  onCardClick,
  onImageClick
}: {
  card: Card;
  isFlipped: boolean;
  isMobile: boolean;
  onCardClick?: () => void;
  onImageClick?: (imageUrl: string) => void;
}) => {
  const handleClick = () => {
    if (onCardClick && !isFlipped) {
      onCardClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onCardClick && !isFlipped) {
      e.preventDefault();
      onCardClick();
    }
  };

  return (
    <div
      className={`bg-zinc-900 rounded-lg p-6 md:p-8 border border-zinc-800 min-h-[300px] md:min-h-[400px] flex flex-col justify-center transition-colors ${
        !isFlipped && onCardClick ? 'cursor-pointer hover:border-zinc-700' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={!isFlipped && onCardClick ? 0 : -1}
      role={!isFlipped && onCardClick ? 'button' : undefined}
      aria-label={!isFlipped && onCardClick ? 'Cliquer pour retourner la carte' : undefined}
    >
      {!isFlipped ? (
        // Front of card
        <div className="text-center">
          <CardContentDisplay
            text={card.front}
            textType={card.frontType}
            imagePath={card.frontImage}
            className="text-xl md:text-2xl text-foreground"
            autoResize={true}
            maxHeight={isMobile ? 450 : 600}
            onImageClick={onImageClick}
          />
        </div>
      ) : (
        // Both sides of card
        <div className="space-y-4 md:space-y-6">
          <div className="text-center">
            <CardContentDisplay
              text={card.front}
              textType={card.frontType}
              imagePath={card.frontImage}
              className="text-lg md:text-xl text-zinc-400"
              autoResize={true}
              maxHeight={isMobile ? 180 : 250}
              onImageClick={onImageClick}
            />
          </div>
          <div className="border-t border-zinc-700"></div>
          <div className="text-center">
            <CardContentDisplay
              text={card.back}
              textType={card.backType}
              imagePath={card.backImage}
              className="text-xl md:text-2xl text-foreground"
              autoResize={true}
              maxHeight={isMobile ? 280 : 350}
              onImageClick={onImageClick}
            />
          </div>
        </div>
      )}
    </div>
  );
});

CardDisplay.displayName = 'CardDisplay';

// Composant pour précharger la carte suivante (invisible)
const CardPreloader = memo(({ card }: { card: Card | null }) => {
  if (!card) return null;

  return (
    <div className="hidden" aria-hidden="true">
      <MathText text={card.front} contentType={card.frontType} className="" />
      <MathText text={card.back} contentType={card.backType} className="" />
    </div>
  );
});

CardPreloader.displayName = 'CardPreloader';

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
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const isStudyMode = searchParams.get('mode') === 'study';
  const [allCards, setAllCards] = useState<Card[]>([]); // All cards from the deck
  const [cardQueue, setCardQueue] = useState<Card[]>([]); // Dynamic queue of cards
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total: 0, again: 0, hard: 0, good: 0, easy: 0 });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();
  const isMobile = useIsMobile();

  // Calculer la prochaine carte à précharger (optimisation)
  const nextCard = useMemo(() => {
    if (cardQueue.length > 1) {
      return cardQueue[1]; // La carte suivante dans la file
    }
    return null;
  }, [cardQueue]);

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
        // Synchronize saved queue with fresh data from API
        // This ensures any edits made to cards are reflected in the review session
        const syncedQueue = savedSession.cardQueue.map(savedCard => {
          const freshCard = data.cards.find((c: Card) => c.id === savedCard.id);
          if (!freshCard) return savedCard; // Card was deleted, keep saved version

          // Update card content with fresh data while preserving session state
          return {
            ...savedCard,
            front: freshCard.front,
            back: freshCard.back,
            frontType: freshCard.frontType,
            backType: freshCard.backType,
          };
        }).filter(card => {
          // Remove cards that no longer exist in the deck
          return data.cards.some((c: Card) => c.id === card.id);
        });

        setCardQueue(syncedQueue);
        setSessionStats(savedSession.sessionStats);

        // Find the current card from the synced queue
        const currentCardFromSaved = syncedQueue.find(
          card => card.id === savedSession.currentCardId
        );
        setCurrentCard(currentCardFromSaved || syncedQueue[0]);
      } else {
        // Initialize the queue with all cards shuffled randomly
        const shuffledCards = shuffleArray<Card>(data.cards);
        setCardQueue(shuffledCards);

        // Set the first card as current
        if (shuffledCards.length > 0) {
          setCurrentCard(shuffledCards[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = useCallback(() => {
    setIsFlipped(true);
  }, []);

  const handleRating = useCallback(async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (submitting || !currentCard) return;

    setSubmitting(true);

    try {
      // Mode étude : pas de sauvegarde des stats, juste passer à la carte suivante
      if (isStudyMode) {
        // Remove current card from queue
        const remainingQueue = cardQueue.slice(1);

        // If queue becomes empty, restart with all cards shuffled
        if (remainingQueue.length === 0) {
          const shuffledCards = shuffleArray<Card>(allCards);
          setCardQueue(shuffledCards);
          setCurrentCard(shuffledCards[0]);
        } else {
          setCardQueue(remainingQueue);
          setCurrentCard(remainingQueue[0]);
        }

        // Reset flip state for next card
        setIsFlipped(false);
        setSubmitting(false);
        return;
      }

      // Mode révision normal : OPTIMISTIC UPDATE
      // Sauvegarder l'ancien état pour rollback en cas d'erreur
      const oldCardQueue = cardQueue;
      const oldCurrentCard = currentCard;
      const oldStats = sessionStats;
      const oldIsFlipped = isFlipped;

      // Calculer les nouvelles stats immédiatement
      const updatedStats = {
        total: sessionStats.total + 1,
        again: sessionStats.again + (rating === 'again' ? 1 : 0),
        hard: sessionStats.hard + (rating === 'hard' ? 1 : 0),
        good: sessionStats.good + (rating === 'good' ? 1 : 0),
        easy: sessionStats.easy + (rating === 'easy' ? 1 : 0),
      };

      // Remove current card from queue
      const remainingQueue = cardQueue.slice(1);

      // Reinsert the card at the appropriate position based on rating
      // Note: if rating is "easy", insertCardInQueue returns the queue without reinsertion
      const newQueue = insertCardInQueue(remainingQueue, currentCard, rating as Rating);

      // Mettre à jour l'UI IMMÉDIATEMENT (avant l'appel API)
      setSessionStats(updatedStats);

      // Si la file est vide, recommencer avec toutes les cartes mélangées (rotation infinie)
      if (newQueue.length === 0) {
        const shuffledCards = shuffleArray<Card>(allCards);
        setCardQueue(shuffledCards);
        setCurrentCard(shuffledCards[0]);

        // Save session state with new shuffled queue
        saveSessionState(deckId, {
          cardQueue: shuffledCards,
          currentCardId: shuffledCards[0].id,
          sessionStats: updatedStats,
        });
      } else {
        setCardQueue(newQueue);
        setCurrentCard(newQueue[0]);

        // Save session state
        saveSessionState(deckId, {
          cardQueue: newQueue,
          currentCardId: newQueue[0].id,
          sessionStats: updatedStats,
        });
      }

      // Reset flip state immédiatement
      setIsFlipped(false);
      setSubmitting(false);

      // Envoyer à l'API en arrière-plan (sans bloquer l'UI)
      fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: oldCurrentCard.id,
          rating,
        }),
      }).catch(error => {
        console.error('Error submitting review:', error);

        // Rollback en cas d'erreur réseau
        setCardQueue(oldCardQueue);
        setCurrentCard(oldCurrentCard);
        setSessionStats(oldStats);
        setIsFlipped(oldIsFlipped);
        setSubmitting(false);

        alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
      });

    } catch (error) {
      console.error('Error in handleRating:', error);
      alert('Erreur lors du traitement de la révision');
      setSubmitting(false);
    }
  }, [submitting, currentCard, isStudyMode, sessionStats, cardQueue, allCards, deckId, isFlipped]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Prevent action if submitting
      if (submitting) return;

      // Flip card with Space (only when card is not flipped)
      if (!isFlipped && e.code === 'Space') {
        e.preventDefault();
        handleFlip();
        return;
      }

      // In study mode, Space also advances to next card (when flipped)
      if (isFlipped && isStudyMode && e.code === 'Space') {
        e.preventDefault();
        handleRating('good');
        return;
      }

      // Rating shortcuts (only when card is flipped)
      if (isFlipped) {
        switch (e.code) {
          case 'Digit1':
          case 'Numpad1':
            e.preventDefault();
            handleRating('again');
            break;
          case 'Digit2':
          case 'Numpad2':
            e.preventDefault();
            handleRating('hard');
            break;
          case 'Digit3':
          case 'Numpad3':
            e.preventDefault();
            handleRating('good');
            break;
          case 'Digit4':
          case 'Numpad4':
            e.preventDefault();
            handleRating('easy');
            break;
        }
      }

      // Quit with Escape
      if (e.code === 'Escape') {
        e.preventDefault();
        router.push('/dashboard');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, submitting, currentCard, router, isStudyMode, handleRating, handleFlip]);

  if (loading) {
    return <LoadingAnimation fullScreen message="Chargement..." />;
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
            <div className="flex items-center gap-3">
              {isStudyMode && (
                <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-xs font-medium border border-purple-800/50">
                  Mode Étude
                </span>
              )}
              <div className="text-zinc-400 text-sm">
                {isStudyMode ? 'Navigation libre' : `Session continue • ${sessionStats.total} cartes révisées`}
              </div>
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
          <CardDisplay
            card={currentCard}
            isFlipped={isFlipped}
            isMobile={isMobile}
            onCardClick={() => !isFlipped && handleFlip()}
            onImageClick={setSelectedImage}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {!isFlipped ? (
            // Flip button
            <div className="space-y-3">
              <button
                onClick={handleFlip}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-4 rounded-lg transition-colors text-lg"
              >
                Retourner
              </button>
              {!isMobile && (
                <div className="text-center text-zinc-500 text-sm">
                  Appuyez sur <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">Espace</kbd> pour retourner
                </div>
              )}
            </div>
          ) : isStudyMode ? (
            // Study mode: single "Next card" button
            <div className="space-y-3">
              <button
                onClick={() => handleRating('good')}
                disabled={submitting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-4 px-4 rounded-lg transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Carte suivante
              </button>
              {!isMobile && (
                <div className="text-center text-zinc-500 text-sm">
                  Appuyez sur <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">Espace</kbd>, <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">1-4</kbd> pour continuer ou <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">Échap</kbd> pour quitter
                </div>
              )}
            </div>
          ) : (
            // Rating buttons (revision mode)
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  onClick={() => handleRating('again')}
                  disabled={submitting}
                  className="bg-red-900/30 hover:bg-red-900/50 text-red-400 font-medium py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                >
                  <span>Échec</span>
                  {!isMobile && (
                    <kbd className="text-xs px-1.5 py-0.5 bg-red-950/50 rounded border border-red-900/50">1</kbd>
                  )}
                </button>
                <button
                  onClick={() => handleRating('hard')}
                  disabled={submitting}
                  className="bg-orange-900/30 hover:bg-orange-900/50 text-orange-400 font-medium py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                >
                  <span>Difficile</span>
                  {!isMobile && (
                    <kbd className="text-xs px-1.5 py-0.5 bg-orange-950/50 rounded border border-orange-900/50">2</kbd>
                  )}
                </button>
                <button
                  onClick={() => handleRating('good')}
                  disabled={submitting}
                  className="bg-green-900/30 hover:bg-green-900/50 text-green-400 font-medium py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                >
                  <span>Bon</span>
                  {!isMobile && (
                    <kbd className="text-xs px-1.5 py-0.5 bg-green-950/50 rounded border border-green-900/50">3</kbd>
                  )}
                </button>
                <button
                  onClick={() => handleRating('easy')}
                  disabled={submitting}
                  className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 font-medium py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                >
                  <span>Facile</span>
                  {!isMobile && (
                    <kbd className="text-xs px-1.5 py-0.5 bg-blue-950/50 rounded border border-blue-900/50">4</kbd>
                  )}
                </button>
              </div>
              {!isMobile && (
                <div className="text-center text-zinc-500 text-sm">
                  Utilisez les touches <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">1-4</kbd> ou <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">Échap</kbd> pour quitter
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Précharger la carte suivante en arrière-plan */}
      <CardPreloader card={nextCard} />

      {/* Image Overlay */}
      <ImageOverlay
        imageUrl={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
