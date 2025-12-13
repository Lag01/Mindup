'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MathText from '@/components/MathText';
import ImageUploader from '@/components/ImageUploader';
import CardContentDisplay from '@/components/CardContentDisplay';
import ImageOverlay from '@/components/ImageOverlay';
import { useUser } from '@/hooks/useUser';
import { Deck, CardFormData } from '@/lib/types';

export default function AddCards() {
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

  // Charger les infos du deck
  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const response = await fetch(`/api/decks/${deckId}`);
        if (!response.ok) throw new Error('Failed to fetch deck');
        const data = await response.json();

        // Bloquer l'accès si le deck est importé
        if (data.deck.originalDeckId) {
          alert('Vous ne pouvez pas ajouter de cartes à un deck importé. Il est synchronisé avec le deck public.');
          router.push('/dashboard');
          return;
        }

        setDeck(data.deck);
      } catch (error) {
        console.error('Error fetching deck:', error);
        alert('Erreur lors du chargement du deck');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDeck();
  }, [deckId, router]);

  // Focus automatique au chargement
  useEffect(() => {
    if (!loading) {
      setTimeout(() => frontInputRef.current?.focus(), 100);
    }
  }, [loading]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        createAndContinue();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        resetForm();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [cardForm, saving]);

  // Afficher un toast temporaire
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
    // Reset des toggles - Par défaut : Texte actif, autres désactivés
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

    // Swap des états de toggle
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

  // Fonction helper pour vérifier si on peut désactiver un champ
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

  // Handlers de toggle pour les champs FRONT
  const handleToggleFrontText = useCallback(() => {
    if (showFrontText && !canDisableFrontField()) {
      showToastMessage('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    setShowFrontText(!showFrontText);

    if (!showFrontText) {
      // On active Texte → désactiver LaTeX
      setShowFrontLatex(false);
      setCardForm(prev => ({ ...prev, frontType: 'TEXT' }));
    }
  }, [showFrontText, canDisableFrontField, showToastMessage]);

  const handleToggleFrontLatex = useCallback(() => {
    if (showFrontLatex && !canDisableFrontField()) {
      showToastMessage('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    setShowFrontLatex(!showFrontLatex);

    if (!showFrontLatex) {
      // On active LaTeX → désactiver Texte
      setShowFrontText(false);
      setCardForm(prev => ({ ...prev, frontType: 'LATEX' }));
    }
  }, [showFrontLatex, canDisableFrontField, showToastMessage]);

  const handleToggleFrontImage = useCallback(async () => {
    if (showFrontImage && !canDisableFrontField()) {
      showToastMessage('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    if (showFrontImage && cardForm.frontImage) {
      // Supprimer l'image du serveur
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

  // Handlers de toggle pour les champs BACK
  const handleToggleBackText = useCallback(() => {
    if (showBackText && !canDisableBackField()) {
      showToastMessage('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    setShowBackText(!showBackText);

    if (!showBackText) {
      // On active Texte → désactiver LaTeX
      setShowBackLatex(false);
      setCardForm(prev => ({ ...prev, backType: 'TEXT' }));
    }
  }, [showBackText, canDisableBackField, showToastMessage]);

  const handleToggleBackLatex = useCallback(() => {
    if (showBackLatex && !canDisableBackField()) {
      showToastMessage('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    setShowBackLatex(!showBackLatex);

    if (!showBackLatex) {
      // On active LaTeX → désactiver Texte
      setShowBackText(false);
      setCardForm(prev => ({ ...prev, backType: 'LATEX' }));
    }
  }, [showBackLatex, canDisableBackField, showToastMessage]);

  const handleToggleBackImage = useCallback(async () => {
    if (showBackImage && !canDisableBackField()) {
      showToastMessage('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    if (showBackImage && cardForm.backImage) {
      // Supprimer l'image du serveur
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
    // Vérifier qu'il y a du contenu pour chaque côté (en tenant compte des champs actifs)
    const hasFrontTextContent = (showFrontText || showFrontLatex) && cardForm.front.trim();
    const hasFrontImageContent = showFrontImage && cardForm.frontImage;
    const hasFrontContent = hasFrontTextContent || hasFrontImageContent;

    const hasBackTextContent = (showBackText || showBackLatex) && cardForm.back.trim();
    const hasBackImageContent = showBackImage && cardForm.backImage;
    const hasBackContent = hasBackTextContent || hasBackImageContent;

    if (!hasFrontContent || !hasBackContent) {
      showToastMessage('⚠️ Le recto et le verso doivent contenir du texte ou une image');
      return;
    }

    // OPTIMISTIC UPDATE - Mettre à jour l'UI immédiatement
    const oldCardsCreated = cardsCreated;
    const oldCardForm = cardForm;

    // Incrémenter le compteur et réinitialiser immédiatement
    setCardsCreated(prev => prev + 1);
    showToastMessage('✓ Carte ajoutée');
    resetForm();

    // Envoyer à l'API en arrière-plan
    try {
      const response = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oldCardForm),
      });

      if (!response.ok) throw new Error('Failed to create card');
    } catch (error) {
      console.error('Error creating card:', error);

      // Rollback en cas d'erreur
      setCardsCreated(oldCardsCreated);
      setCardForm(oldCardForm);
      showToastMessage('❌ Erreur lors de la création');
    }
  }, [cardForm, cardsCreated, deckId, resetForm, showToastMessage,
      showFrontText, showFrontLatex, showFrontImage,
      showBackText, showBackLatex, showBackImage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-zinc-400">Chargement...</div>
      </div>
    );
  }

  if (!deck) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header fixe */}
      <header className="flex-none h-[60px] bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-full flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
              Ajout rapide : {deck.name}
            </h1>
            {cardsCreated > 0 && (
              <p className="text-xs text-emerald-400">
                {cardsCreated} carte{cardsCreated > 1 ? 's' : ''} créée{cardsCreated > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => router.push(`/deck/${deckId}/edit`)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">Mode édition</span>
              <span className="sm:hidden">Éditer</span>
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm whitespace-nowrap"
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
                  <button
                    onClick={handleToggleFrontText}
                    className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                      showFrontText
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Texte
                  </button>
                  <button
                    onClick={handleToggleFrontLatex}
                    className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                      showFrontLatex
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    LaTeX
                  </button>
                  {isAdmin && (
                    <button
                      onClick={handleToggleFrontImage}
                      className={`px-2.5 py-0.5 rounded text-xs transition-colors flex items-center gap-1 ${
                        showFrontImage
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Image
                    </button>
                  )}
                </div>
              </div>

              {/* Afficher textarea seulement si Texte OU LaTeX est actif */}
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
                  className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[100px] sm:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm sm:text-base"
                />
              )}

              {/* Aperçu LaTeX - Condition mise à jour */}
              {cardForm.front && showFrontLatex && (
                <div className="mt-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                  <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
                  <MathText
                    text={cardForm.front}
                    contentType="LATEX"
                    autoResize={false}
                    maxHeight={200}
                    className="text-foreground"
                  />
                </div>
              )}

              {/* Upload image recto */}
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
            <div className="flex justify-center -my-2">
              <button
                type="button"
                onClick={swapFrontBack}
                className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 p-2 rounded-lg transition-colors group"
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
                  <button
                    onClick={handleToggleBackText}
                    className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                      showBackText
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Texte
                  </button>
                  <button
                    onClick={handleToggleBackLatex}
                    className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                      showBackLatex
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    LaTeX
                  </button>
                  {isAdmin && (
                    <button
                      onClick={handleToggleBackImage}
                      className={`px-2.5 py-0.5 rounded text-xs transition-colors flex items-center gap-1 ${
                        showBackImage
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Image
                    </button>
                  )}
                </div>
              </div>

              {/* Afficher textarea seulement si Texte OU LaTeX est actif */}
              {(showBackText || showBackLatex) && (
                <textarea
                  value={cardForm.back}
                  onChange={e =>
                    setCardForm(prev => ({ ...prev, back: e.target.value }))
                  }
                  placeholder={showBackLatex
                    ? "Entrez du LaTeX (ex: $\\frac{a}{b}$)..."
                    : "Entrez le verso de la carte..."}
                  className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[100px] sm:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm sm:text-base"
                />
              )}

              {/* Aperçu LaTeX - Condition mise à jour */}
              {cardForm.back && showBackLatex && (
                <div className="mt-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                  <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
                  <MathText
                    text={cardForm.back}
                    contentType="LATEX"
                    autoResize={false}
                    maxHeight={200}
                    className="text-foreground"
                  />
                </div>
              )}

              {/* Upload image verso */}
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

      {/* Footer fixe */}
      <footer className="flex-none bg-zinc-900 border-t border-zinc-800 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={resetForm}
              className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-3 rounded-lg transition-colors text-sm order-2 sm:order-1"
            >
              Réinitialiser
            </button>
            <button
              onClick={createAndContinue}
              disabled={
                (!cardForm.front.trim() && !cardForm.frontImage) ||
                (!cardForm.back.trim() && !cardForm.backImage)
              }
              className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajouter et continuer
            </button>
          </div>
          <div className="hidden sm:block text-center mt-2 text-zinc-500 text-xs">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">Ctrl+Enter</kbd> pour créer •{' '}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">Échap</kbd> pour réinitialiser
          </div>
        </div>
      </footer>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-lg shadow-lg border border-zinc-700 z-50 animate-fade-in">
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
