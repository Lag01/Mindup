'use client';

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import MathText from '@/components/MathText';
import CardContentDisplay from '@/components/CardContentDisplay';
import ImageOverlay from '@/components/ImageOverlay';
import LoadingAnimation from '@/components/LoadingAnimation';
import { advanceCyclicQueue, peekNextCyclicCard, Rating } from '@/lib/revision';
import { Card, SessionState, PendingReinsertion } from '@/lib/types';
import { useIsMobile } from '@/hooks/useIsMobile';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const CardDisplayV2 = memo(({
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
      className={`relative bg-zinc-900/80 backdrop-blur-sm rounded-xl p-6 md:p-8 border min-h-[300px] md:min-h-[400px] max-h-[500px] md:max-h-[650px] flex flex-col justify-center overflow-auto transition-all duration-300 ${
        isFlipped
          ? 'border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]'
          : 'border-zinc-700/50 hover:border-zinc-600/50'
      } ${!isFlipped && onCardClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={!isFlipped && onCardClick ? 0 : -1}
      role={!isFlipped && onCardClick ? 'button' : undefined}
      aria-label={!isFlipped && onCardClick ? 'Cliquer pour retourner la carte' : undefined}
    >
      {!isFlipped ? (
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
          <div className="border-t border-cyan-500/20"></div>
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

CardDisplayV2.displayName = 'CardDisplayV2';

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

function getSessionKey(
  deckId: string,
  mode: 'study' | 'review',
  learningMethod?: 'IMMEDIATE' | 'ANKI'
): string {
  if (mode === 'study') {
    return `study-session-${deckId}`;
  }
  if (learningMethod === 'ANKI') {
    return `review-anki-session-${deckId}`;
  }
  return `review-session-${deckId}`;
}

function saveSessionState(
  deckId: string,
  state: SessionState,
  mode: 'study' | 'review',
  learningMethod: 'IMMEDIATE' | 'ANKI'
): void {
  try {
    const extendedState: SessionState = {
      ...state,
      mode,
      learningMethod,
      version: state.version ?? 1
    };
    const key = getSessionKey(deckId, mode, learningMethod);
    localStorage.setItem(key, JSON.stringify(extendedState));
  } catch (error) {
    console.error('Error saving session state:', error);
  }
}

function loadSessionState(
  deckId: string,
  mode: 'study' | 'review',
  learningMethod: 'IMMEDIATE' | 'ANKI'
): SessionState | null {
  try {
    const key = getSessionKey(deckId, mode, learningMethod);
    const saved = localStorage.getItem(key);

    if (saved) {
      const parsed: SessionState = JSON.parse(saved);

      if (parsed.mode && parsed.mode !== mode) {
        return null;
      }

      if (mode === 'review' && parsed.learningMethod && parsed.learningMethod !== learningMethod) {
        return null;
      }

      return parsed;
    }
  } catch (error) {
    console.error('Error loading session state:', error);
  }
  return null;
}

function clearSessionState(
  deckId: string,
  mode: 'study' | 'review',
  learningMethod?: 'IMMEDIATE' | 'ANKI'
): void {
  try {
    const key = getSessionKey(deckId, mode, learningMethod || 'IMMEDIATE');
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing session state:', error);
  }
}

export default function ReviewV2() {
  const params = useParams();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const isStudyMode = searchParams.get('mode') === 'study';
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [cardQueue, setCardQueue] = useState<Card[]>([]);
  const [baseDeck, setBaseDeck] = useState<Card[]>([]);
  const [baseIndex, setBaseIndex] = useState(0);
  const [pendingReinsertions, setPendingReinsertions] = useState<PendingReinsertion[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total: 0, again: 0, hard: 0, good: 0, easy: 0 });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [learningMethod, setLearningMethod] = useState<'IMMEDIATE' | 'ANKI'>('IMMEDIATE');
  const [noDueCards, setNoDueCards] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();

  const nextCard = useMemo(() => {
    if (learningMethod === 'IMMEDIATE' && !isStudyMode) {
      return peekNextCyclicCard(baseDeck, baseIndex, pendingReinsertions);
    }
    if (cardQueue.length > 1) {
      return cardQueue[1];
    }
    return null;
  }, [cardQueue, learningMethod, isStudyMode, baseDeck, baseIndex, pendingReinsertions]);

  useEffect(() => {
    fetchCards();
  }, [deckId]);

  const fetchCards = async () => {
    try {
      const mode: 'study' | 'review' = isStudyMode ? 'study' : 'review';

      const response = await fetch(`/api/review?deckId=${deckId}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch cards');
      }
      const data = await response.json();

      const method = data.learningMethod || 'IMMEDIATE';
      setLearningMethod(method);
      setAllCards(data.cards);

      if (method === 'ANKI' && data.cards.length === 0 && !isStudyMode) {
        setNoDueCards(true);
        setLoading(false);
        return;
      }

      let savedSession = loadSessionState(deckId, mode, method);

      // Rejeter les anciennes sessions IMMEDIATE (version < 2)
      if (method === 'IMMEDIATE' && !isStudyMode && savedSession && (savedSession.version || 1) < 2) {
        clearSessionState(deckId, mode, method);
        savedSession = null;
      }

      if (method === 'IMMEDIATE' && !isStudyMode) {
        // Mode IMMEDIATE cyclique
        if (savedSession?.baseDeck && savedSession.baseDeck.length > 0) {
          // Restauration : synchroniser le contenu avec les données fraîches
          const syncedBaseDeck = savedSession.baseDeck.map(savedCard => {
            const freshCard = data.cards.find((c: Card) => c.id === savedCard.id);
            if (!freshCard) return savedCard;
            return { ...savedCard, front: freshCard.front, back: freshCard.back, frontType: freshCard.frontType, backType: freshCard.backType };
          }).filter(card => data.cards.some((c: Card) => c.id === card.id));

          // Réinjecter les cartes ajoutées au deck après le démarrage de la session
          const syncedIds = new Set(syncedBaseDeck.map(c => c.id));
          const newCards = shuffleArray<Card>(
            (data.cards as Card[]).filter(c => !syncedIds.has(c.id))
          );
          const finalBaseDeck = [...syncedBaseDeck, ...newCards];

          const syncedPending = (savedSession.pendingReinsertions || []).map(p => {
            const freshCard = data.cards.find((c: Card) => c.id === p.cardId);
            if (!freshCard) return p;
            return { ...p, card: { ...p.card, front: freshCard.front, back: freshCard.back, frontType: freshCard.frontType, backType: freshCard.backType } };
          }).filter(p => data.cards.some((c: Card) => c.id === p.cardId));

          if (finalBaseDeck.length === 0) {
            // Tout a été supprimé : démarrage frais
            const shuffled = shuffleArray<Card>(data.cards);
            setBaseDeck(shuffled);
            setBaseIndex(1);
            setPendingReinsertions([]);
            if (shuffled.length > 0) {
              setCurrentCard(shuffled[0]);
            }
          } else {
            setBaseDeck(finalBaseDeck);
            setBaseIndex(savedSession.baseIndex ?? 0);
            setPendingReinsertions(syncedPending);
            setSessionStats(savedSession.sessionStats);

            const restoredCurrent = data.cards.find((c: Card) => c.id === savedSession!.currentCardId);
            setCurrentCard(restoredCurrent || finalBaseDeck[(savedSession.baseIndex ?? 0) % finalBaseDeck.length]);
          }
        } else {
          // Démarrage frais pour IMMEDIATE
          const shuffled = shuffleArray<Card>(data.cards);
          setBaseDeck(shuffled);
          setBaseIndex(1);
          setPendingReinsertions([]);
          if (shuffled.length > 0) {
            setCurrentCard(shuffled[0]);
          }
        }
      } else if (savedSession && savedSession.cardQueue.length > 0) {
        const syncedQueue = savedSession.cardQueue.map(savedCard => {
          const freshCard = data.cards.find((c: Card) => c.id === savedCard.id);
          if (!freshCard) return savedCard;

          return {
            ...savedCard,
            front: freshCard.front,
            back: freshCard.back,
            frontType: freshCard.frontType,
            backType: freshCard.backType,
          };
        }).filter(card => {
          return data.cards.some((c: Card) => c.id === card.id);
        });

        setCardQueue(syncedQueue);
        setSessionStats(savedSession.sessionStats);

        const currentCardFromSaved = syncedQueue.find(
          card => card.id === savedSession!.currentCardId
        );
        setCurrentCard(currentCardFromSaved || syncedQueue[0]);
      } else {
        if (method === 'ANKI' && !isStudyMode) {
          setCardQueue(data.cards);
          if (data.cards.length > 0) {
            setCurrentCard(data.cards[0]);
          }
        } else {
          const shuffledCards = shuffleArray<Card>(data.cards);
          setCardQueue(shuffledCards);
          if (shuffledCards.length > 0) {
            setCurrentCard(shuffledCards[0]);
          }
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
      if (isStudyMode) {
        const remainingQueue = cardQueue.slice(1);

        if (remainingQueue.length === 0) {
          const shuffledCards = shuffleArray<Card>(allCards);
          setCardQueue(shuffledCards);
          setCurrentCard(shuffledCards[0]);
        } else {
          setCardQueue(remainingQueue);
          setCurrentCard(remainingQueue[0]);
        }

        setIsFlipped(false);
        setSubmitting(false);
        return;
      }

      if (learningMethod === 'ANKI') {
        const updatedStats = {
          total: sessionStats.total + 1,
          again: sessionStats.again + (rating === 'again' ? 1 : 0),
          hard: sessionStats.hard + (rating === 'hard' ? 1 : 0),
          good: sessionStats.good + (rating === 'good' ? 1 : 0),
          easy: sessionStats.easy + (rating === 'easy' ? 1 : 0),
        };
        setSessionStats(updatedStats);

        const remainingQueue = cardQueue.slice(1);

        if (remainingQueue.length === 0) {
          setNoDueCards(true);
          setCardQueue([]);
          setCurrentCard(null);
          clearSessionState(deckId, 'review', learningMethod);
        } else {
          setCardQueue(remainingQueue);
          setCurrentCard(remainingQueue[0]);

          saveSessionState(deckId, {
            cardQueue: remainingQueue,
            currentCardId: remainingQueue[0].id,
            sessionStats: updatedStats,
          }, 'review', learningMethod);
        }

        setIsFlipped(false);
        setSubmitting(false);

        fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: currentCard.id, rating }),
        }).catch(error => {
          console.error('Error saving review:', error);
        });

        return;
      }

      const oldBaseDeck = baseDeck;
      const oldBaseIndex = baseIndex;
      const oldPending = pendingReinsertions;
      const oldCurrentCard = currentCard;
      const oldStats = sessionStats;
      const oldIsFlipped = isFlipped;

      const updatedStats = {
        total: sessionStats.total + 1,
        again: sessionStats.again + (rating === 'again' ? 1 : 0),
        hard: sessionStats.hard + (rating === 'hard' ? 1 : 0),
        good: sessionStats.good + (rating === 'good' ? 1 : 0),
        easy: sessionStats.easy + (rating === 'easy' ? 1 : 0),
      };

      const { nextCard: next, newBaseIndex, newPending } = advanceCyclicQueue(
        currentCard, rating as Rating, baseDeck, baseIndex, pendingReinsertions
      );

      setSessionStats(updatedStats);
      setBaseIndex(newBaseIndex);
      setPendingReinsertions(newPending);
      setCurrentCard(next);

      saveSessionState(deckId, {
        cardQueue: [],
        currentCardId: next.id,
        sessionStats: updatedStats,
        baseDeck,
        baseIndex: newBaseIndex,
        pendingReinsertions: newPending,
        version: 2,
      }, 'review', learningMethod);

      setIsFlipped(false);
      setSubmitting(false);

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

        setBaseDeck(oldBaseDeck);
        setBaseIndex(oldBaseIndex);
        setPendingReinsertions(oldPending);
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
  }, [submitting, currentCard, isStudyMode, learningMethod, sessionStats, cardQueue, allCards, deckId, isFlipped, baseDeck, baseIndex, pendingReinsertions]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (submitting) return;

      if (!isFlipped && e.code === 'Space') {
        e.preventDefault();
        handleFlip();
        return;
      }

      if (isFlipped && isStudyMode && e.code === 'Space') {
        e.preventDefault();
        handleRating('good');
        return;
      }

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

      if (e.code === 'Escape') {
        e.preventDefault();
        router.push('/dashboard-entry');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, submitting, currentCard, router, isStudyMode, handleRating, handleFlip]);

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  if (noDueCards && learningMethod === 'ANKI') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)]">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Toutes les cartes sont révisées !
          </h2>
          <p className="text-zinc-400 mb-6">
            Vous avez terminé vos révisions pour aujourd'hui. Revenez demain pour de nouvelles cartes.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => router.push('/dashboard-entry')}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium px-6 py-3 rounded-lg transition-all shadow-lg shadow-blue-500/20"
            >
              Retour au dashboard
            </button>
            <button
              onClick={() => router.push(`/deck/${deckId}/review?mode=study`)}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium px-6 py-3 rounded-lg transition-all shadow-lg shadow-purple-500/20"
            >
              Mode étude (toutes les cartes)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">
            Aucune carte dans ce deck
          </p>
          <button
            onClick={() => router.push('/dashboard-entry')}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium px-6 py-3 rounded-lg transition-all shadow-lg shadow-blue-500/20"
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col">
      {/* Header V2 */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {isStudyMode && (
                <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-medium border border-purple-500/30">
                  Mode Étude
                </span>
              )}
              {!isStudyMode && (
                <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-xs font-medium border border-cyan-500/30">
                  {sessionStats.total} révisée{sessionStats.total > 1 ? 's' : ''}
                </span>
              )}
              <div className="text-zinc-500 text-sm">
                {isStudyMode
                  ? 'Navigation libre'
                  : learningMethod === 'ANKI'
                    ? `${cardQueue.length} carte${cardQueue.length > 1 ? 's' : ''} restante${cardQueue.length > 1 ? 's' : ''}`
                    : 'Session continue'
                }
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard-entry')}
              className="bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-300 font-medium px-4 py-2 rounded-lg transition-all text-sm border border-zinc-700/50"
            >
              Quitter
            </button>
          </div>
        </div>
      </header>

      {/* Card Display Area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <CardDisplayV2
            card={currentCard}
            isFlipped={isFlipped}
            isMobile={isMobile}
            onCardClick={() => !isFlipped && handleFlip()}
            onImageClick={setSelectedImage}
          />
        </div>
      </div>

      {/* Action Buttons V2 */}
      <div className="border-t border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {!isFlipped ? (
            <div className="space-y-3">
              <button
                onClick={handleFlip}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium py-4 px-4 rounded-xl transition-all text-lg shadow-lg shadow-blue-500/20"
              >
                Retourner
              </button>
              {!isMobile && (
                <div className="text-center text-zinc-500 text-sm">
                  Appuyez sur <kbd className="px-2 py-1 bg-zinc-800/50 rounded border border-zinc-700/50 text-zinc-400">Espace</kbd> pour retourner
                </div>
              )}
            </div>
          ) : isStudyMode ? (
            <div className="space-y-3">
              <button
                onClick={() => handleRating('good')}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium py-4 px-4 rounded-xl transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
              >
                Carte suivante
              </button>
              {!isMobile && (
                <div className="text-center text-zinc-500 text-sm">
                  Appuyez sur <kbd className="px-2 py-1 bg-zinc-800/50 rounded border border-zinc-700/50 text-zinc-400">Espace</kbd>, <kbd className="px-2 py-1 bg-zinc-800/50 rounded border border-zinc-700/50 text-zinc-400">1-4</kbd> pour continuer ou <kbd className="px-2 py-1 bg-zinc-800/50 rounded border border-zinc-700/50 text-zinc-400">Échap</kbd> pour quitter
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  onClick={() => handleRating('again')}
                  disabled={submitting}
                  className="bg-gradient-to-b from-red-900/40 to-red-900/20 hover:from-red-900/60 hover:to-red-900/40 text-red-400 font-medium py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 border border-red-500/20 shadow-lg shadow-red-500/5"
                >
                  <span>Échec</span>
                  {!isMobile && (
                    <kbd className="text-xs px-1.5 py-0.5 bg-red-950/50 rounded border border-red-900/50">1</kbd>
                  )}
                </button>
                <button
                  onClick={() => handleRating('hard')}
                  disabled={submitting}
                  className="bg-gradient-to-b from-orange-900/40 to-orange-900/20 hover:from-orange-900/60 hover:to-orange-900/40 text-orange-400 font-medium py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 border border-orange-500/20 shadow-lg shadow-orange-500/5"
                >
                  <span>Difficile</span>
                  {!isMobile && (
                    <kbd className="text-xs px-1.5 py-0.5 bg-orange-950/50 rounded border border-orange-900/50">2</kbd>
                  )}
                </button>
                <button
                  onClick={() => handleRating('good')}
                  disabled={submitting}
                  className="bg-gradient-to-b from-green-900/40 to-green-900/20 hover:from-green-900/60 hover:to-green-900/40 text-green-400 font-medium py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 border border-green-500/20 shadow-lg shadow-green-500/5"
                >
                  <span>Bon</span>
                  {!isMobile && (
                    <kbd className="text-xs px-1.5 py-0.5 bg-green-950/50 rounded border border-green-900/50">3</kbd>
                  )}
                </button>
                <button
                  onClick={() => handleRating('easy')}
                  disabled={submitting}
                  className="bg-gradient-to-b from-blue-900/40 to-blue-900/20 hover:from-blue-900/60 hover:to-blue-900/40 text-blue-400 font-medium py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 border border-blue-500/20 shadow-lg shadow-blue-500/5"
                >
                  <span>Facile</span>
                  {!isMobile && (
                    <kbd className="text-xs px-1.5 py-0.5 bg-blue-950/50 rounded border border-blue-900/50">4</kbd>
                  )}
                </button>
              </div>
              {!isMobile && (
                <div className="text-center text-zinc-500 text-sm">
                  Utilisez les touches <kbd className="px-2 py-1 bg-zinc-800/50 rounded border border-zinc-700/50 text-zinc-400">1-4</kbd> ou <kbd className="px-2 py-1 bg-zinc-800/50 rounded border border-zinc-700/50 text-zinc-400">Échap</kbd> pour quitter
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CardPreloader card={nextCard} />

      <ImageOverlay
        imageUrl={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
