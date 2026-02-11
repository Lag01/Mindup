'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function DeckSettingsV1() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<any>(null);
  const [learningMethod, setLearningMethod] = useState<'IMMEDIATE' | 'ANKI'>('IMMEDIATE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDeck();
  }, [deckId]);

  const fetchDeck = async () => {
    try {
      const response = await fetch(`/api/decks`);
      const data = await response.json();

      const foundDeck = data.decks.find((d: any) => d.id === deckId);
      if (foundDeck) {
        setDeck(foundDeck);
        setLearningMethod(foundDeck.learningMethod || 'IMMEDIATE');
      } else {
        setError('Deck non trouvé');
      }
    } catch (err) {
      setError('Erreur lors du chargement du deck');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!deck) return;

    // Si la méthode n'a pas changé, pas besoin de sauvegarder
    if (learningMethod === deck.learningMethod) {
      router.push('/dashboard-entry');
      return;
    }

    // Demander confirmation car cela réinitialisera les stats
    const confirmed = window.confirm(
      'Changer de méthode d\'apprentissage réinitialisera toutes les statistiques de ce deck. ' +
      'Cette action est irréversible. Continuer ?'
    );

    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/decks/${deckId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ learningMethod }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Échec de la mise à jour');
      }

      // Succès : rediriger vers le dashboard
      router.push('/dashboard-entry');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
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

  if (error && !deck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard-entry')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/dashboard-entry')}
            className="text-zinc-400 hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Paramètres du deck</h1>
            <p className="text-zinc-400 text-sm mt-1">{deck?.name}</p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Méthode d&apos;apprentissage
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 bg-zinc-800 rounded-lg cursor-pointer border-2 border-transparent hover:border-zinc-700 transition-colors">
                <input
                  type="radio"
                  name="learningMethod"
                  value="IMMEDIATE"
                  checked={learningMethod === 'IMMEDIATE'}
                  onChange={(e) => setLearningMethod(e.target.value as 'IMMEDIATE')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground mb-1">
                    Révision immédiate
                  </div>
                  <div className="text-sm text-zinc-400">
                    Les cartes reviennent rapidement dans la session selon votre réponse.
                    Idéal pour apprendre rapidement de nouvelles informations.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-zinc-800 rounded-lg cursor-pointer border-2 border-transparent hover:border-zinc-700 transition-colors">
                <input
                  type="radio"
                  name="learningMethod"
                  value="ANKI"
                  checked={learningMethod === 'ANKI'}
                  onChange={(e) => setLearningMethod(e.target.value as 'ANKI')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground mb-1">
                    Répétition espacée (Anki)
                  </div>
                  <div className="text-sm text-zinc-400">
                    Les cartes reviennent selon un calendrier optimisé (1j, 3j, 7j, 14j, 30j).
                    Idéal pour la mémorisation à long terme.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Avertissement si changement */}
          {deck && learningMethod !== deck.learningMethod && (
            <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <p className="text-amber-400 text-sm">
                Attention : Changer de méthode d&apos;apprentissage réinitialisera toutes les statistiques de ce deck.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={() => router.push('/dashboard-entry')}
              disabled={saving}
              className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
