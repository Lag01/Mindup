'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MathText from '@/components/MathText';

interface Deck {
  id: string;
  name: string;
}

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
  });
  const [saving, setSaving] = useState(false);
  const [cardsCreated, setCardsCreated] = useState(0);
  const frontInputRef = useRef<HTMLTextAreaElement>(null);

  // Charger les infos du deck
  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const response = await fetch(`/api/decks/${deckId}`);
        if (!response.ok) throw new Error('Failed to fetch deck');
        const data = await response.json();
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

  const resetForm = () => {
    setCardForm({
      front: '',
      back: '',
      frontType: 'TEXT',
      backType: 'TEXT',
    });
    setTimeout(() => frontInputRef.current?.focus(), 100);
  };

  const createAndContinue = async () => {
    if (!cardForm.front.trim() || !cardForm.back.trim()) {
      alert('Le recto et le verso sont requis');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardForm),
      });

      if (!response.ok) throw new Error('Failed to create card');

      // Succès : incrémenter le compteur et réinitialiser
      setCardsCreated(prev => prev + 1);
      resetForm();
    } catch (error) {
      console.error('Error creating card:', error);
      alert('Erreur lors de la création de la carte');
    } finally {
      setSaving(false);
    }
  };

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
                    onClick={() =>
                      setCardForm(prev => ({ ...prev, frontType: 'TEXT' }))
                    }
                    className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                      cardForm.frontType === 'TEXT'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Texte
                  </button>
                  <button
                    onClick={() =>
                      setCardForm(prev => ({ ...prev, frontType: 'LATEX' }))
                    }
                    className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                      cardForm.frontType === 'LATEX'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    LaTeX
                  </button>
                </div>
              </div>
              <textarea
                ref={frontInputRef}
                value={cardForm.front}
                onChange={e =>
                  setCardForm(prev => ({ ...prev, front: e.target.value }))
                }
                placeholder="Entrez le recto de la carte..."
                className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[100px] sm:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm sm:text-base"
              />
              {cardForm.front && cardForm.frontType === 'LATEX' && (
                <div className="mt-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                  <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
                  <MathText
                    text={cardForm.front}
                    contentType={cardForm.frontType}
                    autoResize={false}
                    maxHeight={200}
                    className="text-foreground"
                  />
                </div>
              )}
            </div>

            {/* Formulaire Verso */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-zinc-300 font-medium text-sm">Verso</label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCardForm(prev => ({ ...prev, backType: 'TEXT' }))
                    }
                    className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                      cardForm.backType === 'TEXT'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Texte
                  </button>
                  <button
                    onClick={() =>
                      setCardForm(prev => ({ ...prev, backType: 'LATEX' }))
                    }
                    className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                      cardForm.backType === 'LATEX'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    LaTeX
                  </button>
                </div>
              </div>
              <textarea
                value={cardForm.back}
                onChange={e =>
                  setCardForm(prev => ({ ...prev, back: e.target.value }))
                }
                placeholder="Entrez le verso de la carte..."
                className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[100px] sm:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm sm:text-base"
              />
              {cardForm.back && cardForm.backType === 'LATEX' && (
                <div className="mt-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                  <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
                  <MathText
                    text={cardForm.back}
                    contentType={cardForm.backType}
                    autoResize={false}
                    maxHeight={200}
                    className="text-foreground"
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
              disabled={saving}
              className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50 text-sm order-2 sm:order-1"
            >
              Réinitialiser
            </button>
            <button
              onClick={createAndContinue}
              disabled={saving || !cardForm.front.trim() || !cardForm.back.trim()}
              className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {saving ? 'Création...' : 'Ajouter et continuer'}
            </button>
          </div>
          <div className="text-center mt-2 text-zinc-500 text-xs">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">Ctrl+Enter</kbd> pour créer •{' '}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">Échap</kbd> pour réinitialiser
          </div>
        </div>
      </footer>
    </div>
  );
}
