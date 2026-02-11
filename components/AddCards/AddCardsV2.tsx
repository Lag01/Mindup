'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MathText from '@/components/MathText';
import ImageUploader from '@/components/ImageUploader';
import CardContentDisplay from '@/components/CardContentDisplay';
import ImageOverlay from '@/components/ImageOverlay';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useUser } from '@/hooks/useUser';
import { Deck } from '@/lib/types';

export default function AddCardsV2() {
  const params = useParams();
  const deckId = params.id as string;
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardForm, setCardForm] = useState({
    front: '',
    back: '',
    frontType: 'TEXT' as 'TEXT' | 'LATEX',
    backType: 'TEXT' as 'TEXT' | 'LATEX',
    frontImage: null as string | null,
    backImage: null as string | null,
  });
  const [saving, setSaving] = useState(false);
  const [cardsCreated, setCardsCreated] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showFrontText, setShowFrontText] = useState(true);
  const [showFrontLatex, setShowFrontLatex] = useState(false);
  const [showFrontImage, setShowFrontImage] = useState(false);
  const [showBackText, setShowBackText] = useState(true);
  const [showBackLatex, setShowBackLatex] = useState(false);
  const [showBackImage, setShowBackImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLTextAreaElement>(null);
  const { isAdmin } = useUser();

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const response = await fetch(`/api/decks/${deckId}`);
        if (!response.ok) throw new Error('Failed to fetch deck');
        const data = await response.json();

        if (data.deck.originalDeckId) {
          alert('Vous ne pouvez pas ajouter de cartes à un deck importé. Il est synchronisé avec le deck public.');
          router.push('/dashboard-entry');
          return;
        }

        setDeck(data.deck);
      } catch (error) {
        console.error('Error fetching deck:', error);
        alert('Erreur lors du chargement du deck');
        router.push('/dashboard-entry');
      } finally {
        setLoading(false);
      }
    };

    fetchDeck();
  }, [deckId, router]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => frontInputRef.current?.focus(), 100);
    }
  }, [loading]);

  const handleKeyboardRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  useEffect(() => {
    handleKeyboardRef.current = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        createAndContinue();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        resetForm();
      }
    };
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKeyboardRef.current?.(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  const resetForm = useCallback(() => {
    setCardForm({
      front: '',
      back: '',
      frontType: 'TEXT',
      backType: 'TEXT',
      frontImage: null,
      backImage: null,
    });
    setShowFrontText(true);
    setShowFrontLatex(false);
    setShowFrontImage(false);
    setShowBackText(true);
    setShowBackLatex(false);
    setShowBackImage(false);
    requestAnimationFrame(() => {
      frontInputRef.current?.focus();
    });
  }, []);

  const swapFrontBack = useCallback(() => {
    setCardForm(prev => ({
      front: prev.back,
      back: prev.front,
      frontType: prev.backType,
      backType: prev.frontType,
      frontImage: prev.backImage,
      backImage: prev.frontImage,
    }));

    const tempText = showFrontText;
    const tempLatex = showFrontLatex;
    const tempImage = showFrontImage;

    setShowFrontText(showBackText);
    setShowFrontLatex(showBackLatex);
    setShowFrontImage(showBackImage);

    setShowBackText(tempText);
    setShowBackLatex(tempLatex);
    setShowBackImage(tempImage);
  }, [showFrontText, showFrontLatex, showFrontImage,
      showBackText, showBackLatex, showBackImage]);

  const canDisableFrontField = useCallback(() => {
    const activeFieldsCount = [
      showFrontText || showFrontLatex,
      showFrontImage
    ].filter(Boolean).length;
    return activeFieldsCount > 1;
  }, [showFrontText, showFrontLatex, showFrontImage]);

  const canDisableBackField = useCallback(() => {
    const activeFieldsCount = [
      showBackText || showBackLatex,
      showBackImage
    ].filter(Boolean).length;
    return activeFieldsCount > 1;
  }, [showBackText, showBackLatex, showBackImage]);

  const handleToggleFrontText = useCallback(() => {
    if (showFrontText && !canDisableFrontField()) {
      showToastMessage('Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }
    setShowFrontText(!showFrontText);
    if (!showFrontText) {
      setShowFrontLatex(false);
      setCardForm(prev => ({ ...prev, frontType: 'TEXT' }));
    }
  }, [showFrontText, canDisableFrontField, showToastMessage]);

  const handleToggleFrontLatex = useCallback(() => {
    if (showFrontLatex && !canDisableFrontField()) {
      showToastMessage('Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }
    setShowFrontLatex(!showFrontLatex);
    if (!showFrontLatex) {
      setShowFrontText(false);
      setCardForm(prev => ({ ...prev, frontType: 'LATEX' }));
    }
  }, [showFrontLatex, canDisableFrontField, showToastMessage]);

  const handleToggleFrontImage = useCallback(async () => {
    if (showFrontImage && !canDisableFrontField()) {
      showToastMessage('Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }
    if (showFrontImage && cardForm.frontImage) {
      try {
        await fetch('/api/upload/delete-card-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: cardForm.frontImage }),
        });
      } catch (error) {
        console.error('Error deleting image:', error);
      }
      setCardForm(prev => ({ ...prev, frontImage: null }));
    }
    setShowFrontImage(!showFrontImage);
  }, [showFrontImage, cardForm.frontImage, canDisableFrontField, showToastMessage]);

  const handleToggleBackText = useCallback(() => {
    if (showBackText && !canDisableBackField()) {
      showToastMessage('Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }
    setShowBackText(!showBackText);
    if (!showBackText) {
      setShowBackLatex(false);
      setCardForm(prev => ({ ...prev, backType: 'TEXT' }));
    }
  }, [showBackText, canDisableBackField, showToastMessage]);

  const handleToggleBackLatex = useCallback(() => {
    if (showBackLatex && !canDisableBackField()) {
      showToastMessage('Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }
    setShowBackLatex(!showBackLatex);
    if (!showBackLatex) {
      setShowBackText(false);
      setCardForm(prev => ({ ...prev, backType: 'LATEX' }));
    }
  }, [showBackLatex, canDisableBackField, showToastMessage]);

  const handleToggleBackImage = useCallback(async () => {
    if (showBackImage && !canDisableBackField()) {
      showToastMessage('Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }
    if (showBackImage && cardForm.backImage) {
      try {
        await fetch('/api/upload/delete-card-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: cardForm.backImage }),
        });
      } catch (error) {
        console.error('Error deleting image:', error);
      }
      setCardForm(prev => ({ ...prev, backImage: null }));
    }
    setShowBackImage(!showBackImage);
  }, [showBackImage, cardForm.backImage, canDisableBackField, showToastMessage]);

  const createAndContinue = useCallback(async () => {
    const hasFrontTextContent = (showFrontText || showFrontLatex) && cardForm.front.trim();
    const hasFrontImageContent = showFrontImage && cardForm.frontImage;
    const hasFrontContent = hasFrontTextContent || hasFrontImageContent;

    const hasBackTextContent = (showBackText || showBackLatex) && cardForm.back.trim();
    const hasBackImageContent = showBackImage && cardForm.backImage;
    const hasBackContent = hasBackTextContent || hasBackImageContent;

    if (!hasFrontContent || !hasBackContent) {
      showToastMessage('Le recto et le verso doivent contenir du texte ou une image');
      return;
    }

    const oldCardsCreated = cardsCreated;
    const oldCardForm = cardForm;

    setCardsCreated(prev => prev + 1);
    showToastMessage('Carte ajoutée');
    resetForm();

    try {
      const response = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oldCardForm),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        const errorMessage = errorData.error || 'Erreur lors de la création';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating card:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création';
      setCardsCreated(oldCardsCreated);
      setCardForm(oldCardForm);
      showToastMessage(errorMessage);
    }
  }, [cardForm, cardsCreated, deckId, resetForm, showToastMessage,
      showFrontText, showFrontLatex, showFrontImage,
      showBackText, showBackLatex, showBackImage]);

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  if (!deck) {
    return null;
  }

  const ToggleButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 sm:py-0.5 rounded-full text-xs transition-all min-h-[32px] sm:min-h-0 ${
        active
          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20'
          : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 border border-zinc-700/50'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header V2 */}
      <header className="flex-none h-[60px] border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-full flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
              Ajout rapide : {deck.name}
            </h1>
            {cardsCreated > 0 && (
              <span className="flex-shrink-0 bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/30">
                {cardsCreated} carte{cardsCreated > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => router.push(`/deck/${deckId}/edit`)}
              className="bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-300 font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm whitespace-nowrap border border-zinc-700/50"
            >
              <span className="hidden sm:inline">Mode édition</span>
              <span className="sm:hidden">Éditer</span>
            </button>
            <button
              onClick={() => router.push('/dashboard-entry')}
              className="bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-300 font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm whitespace-nowrap border border-zinc-700/50"
            >
              Retour
            </button>
          </div>
        </div>
      </header>

      {/* Zone scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="space-y-4">
            {/* Formulaire Recto */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-zinc-300 font-medium text-sm">Recto</label>
                <div className="flex gap-2">
                  <ToggleButton active={showFrontText} onClick={handleToggleFrontText}>Texte</ToggleButton>
                  <ToggleButton active={showFrontLatex} onClick={handleToggleFrontLatex}>LaTeX</ToggleButton>
                  {isAdmin && (
                    <ToggleButton active={showFrontImage} onClick={handleToggleFrontImage}>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Image
                      </span>
                    </ToggleButton>
                  )}
                </div>
              </div>

              {(showFrontText || showFrontLatex) && (
                <textarea
                  ref={frontInputRef}
                  value={cardForm.front}
                  onChange={e =>
                    setCardForm(prev => ({ ...prev, front: e.target.value }))
                  }
                  placeholder={showFrontLatex
                    ? "Entrez du LaTeX (ex: $\\frac{a}{b}$)..."
                    : "Entrez le recto de la carte..."}
                  className="w-full bg-zinc-800/50 text-foreground border border-zinc-700/50 rounded-xl p-3 min-h-[100px] sm:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/30 text-sm sm:text-base transition-all"
                />
              )}

              {cardForm.front && showFrontLatex && (
                <div className="mt-2 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                  <div className="text-zinc-500 text-xs mb-1">Aperçu LaTeX :</div>
                  <MathText
                    text={cardForm.front}
                    contentType="LATEX"
                    autoResize={false}
                    maxHeight={200}
                    className="text-foreground"
                  />
                </div>
              )}

              {showFrontImage && (
                <div className="mt-3">
                  <ImageUploader
                    currentImage={cardForm.frontImage}
                    onImageUploaded={(path) => setCardForm(prev => ({ ...prev, frontImage: path }))}
                    onImageRemoved={() => setCardForm(prev => ({ ...prev, frontImage: null }))}
                    label="Recto"
                  />
                </div>
              )}
            </div>

            {/* Bouton d'inversion */}
            <div className="flex justify-center my-1 sm:-my-2">
              <button
                type="button"
                onClick={swapFrontBack}
                className="bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-cyan-400 p-2 rounded-lg transition-all group border border-zinc-700/50"
                title="Inverser le recto et le verso"
              >
                <svg className="w-5 h-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* Formulaire Verso */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-zinc-300 font-medium text-sm">Verso</label>
                <div className="flex gap-2">
                  <ToggleButton active={showBackText} onClick={handleToggleBackText}>Texte</ToggleButton>
                  <ToggleButton active={showBackLatex} onClick={handleToggleBackLatex}>LaTeX</ToggleButton>
                  {isAdmin && (
                    <ToggleButton active={showBackImage} onClick={handleToggleBackImage}>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Image
                      </span>
                    </ToggleButton>
                  )}
                </div>
              </div>

              {(showBackText || showBackLatex) && (
                <textarea
                  value={cardForm.back}
                  onChange={e =>
                    setCardForm(prev => ({ ...prev, back: e.target.value }))
                  }
                  placeholder={showBackLatex
                    ? "Entrez du LaTeX (ex: $\\frac{a}{b}$)..."
                    : "Entrez le verso de la carte..."}
                  className="w-full bg-zinc-800/50 text-foreground border border-zinc-700/50 rounded-xl p-3 min-h-[100px] sm:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/30 text-sm sm:text-base transition-all"
                />
              )}

              {cardForm.back && showBackLatex && (
                <div className="mt-2 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                  <div className="text-zinc-500 text-xs mb-1">Aperçu LaTeX :</div>
                  <MathText
                    text={cardForm.back}
                    contentType="LATEX"
                    autoResize={false}
                    maxHeight={200}
                    className="text-foreground"
                  />
                </div>
              )}

              {showBackImage && (
                <div className="mt-3">
                  <ImageUploader
                    currentImage={cardForm.backImage}
                    onImageUploaded={(path) => setCardForm(prev => ({ ...prev, backImage: path }))}
                    onImageRemoved={() => setCardForm(prev => ({ ...prev, backImage: null }))}
                    label="Verso"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer V2 */}
      <footer className="flex-none border-t border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={resetForm}
              className="w-full sm:w-auto bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 font-medium px-4 py-3 rounded-xl transition-all text-sm order-2 sm:order-1 border border-zinc-700/50"
            >
              Réinitialiser
            </button>
            <button
              onClick={createAndContinue}
              disabled={
                (!cardForm.front.trim() && !cardForm.frontImage) ||
                (!cardForm.back.trim() && !cardForm.backImage)
              }
              className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium px-4 py-3 rounded-xl transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 order-1 sm:order-2 shadow-lg shadow-green-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajouter et continuer
            </button>
          </div>
          <div className="hidden sm:block text-center mt-2 text-zinc-500 text-xs">
            <kbd className="px-1.5 py-0.5 bg-zinc-800/50 rounded border border-zinc-700/50 text-zinc-400">Ctrl+Enter</kbd> pour créer •{' '}
            <kbd className="px-1.5 py-0.5 bg-zinc-800/50 rounded border border-zinc-700/50 text-zinc-400">Échap</kbd> pour réinitialiser
          </div>
        </div>
      </footer>

      {/* Toast notification V2 */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-zinc-800/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-2xl border border-zinc-700/50 z-50 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Image Overlay */}
      <ImageOverlay
        imageUrl={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
