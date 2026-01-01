'use client';

import { useState } from 'react';

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deck: { id: string; name: string }) => void;
}

export default function CreateDeckModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateDeckModalProps) {
  const [name, setName] = useState('');
  const [learningMethod, setLearningMethod] = useState<'IMMEDIATE' | 'ANKI'>('IMMEDIATE');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Le nom ne peut pas être vide');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          learningMethod,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Échec de la création');
      }

      const data = await response.json();
      onSuccess(data.deck);
      setName('');
      setLearningMethod('IMMEDIATE');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du deck');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setLearningMethod('IMMEDIATE');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md border border-zinc-800">
        <h2 className="text-xl font-bold text-foreground mb-4">Créer un nouveau deck</h2>

        <form onSubmit={handleSubmit}>
          {/* Nom du deck */}
          <div className="mb-4">
            <label htmlFor="deck-name" className="block text-zinc-300 text-sm mb-2">
              Nom du deck
            </label>
            <input
              id="deck-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Entrez le nom du deck..."
              autoFocus
              maxLength={100}
            />
          </div>

          {/* Méthode d'apprentissage */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Méthode d'apprentissage
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg cursor-pointer border-2 border-transparent hover:border-zinc-700 transition-colors">
                <input
                  type="radio"
                  name="learningMethod"
                  value="IMMEDIATE"
                  checked={learningMethod === 'IMMEDIATE'}
                  onChange={(e) => setLearningMethod(e.target.value as 'IMMEDIATE')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Révision immédiate</div>
                  <div className="text-sm text-zinc-400">
                    Idéal pour apprendre rapidement. Les cartes reviennent rapidement dans la session.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg cursor-pointer border-2 border-transparent hover:border-zinc-700 transition-colors">
                <input
                  type="radio"
                  name="learningMethod"
                  value="ANKI"
                  checked={learningMethod === 'ANKI'}
                  onChange={(e) => setLearningMethod(e.target.value as 'ANKI')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Répétition espacée (Anki)</div>
                  <div className="text-sm text-zinc-400">
                    Idéal pour la mémorisation à long terme. Révisions planifiées sur plusieurs jours.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={creating}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {creating ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
