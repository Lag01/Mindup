'use client';

import { useState } from 'react';

interface EditDeckNameModalProps {
  isOpen: boolean;
  deckId: string;
  currentName: string;
  onClose: () => void;
  onSuccess: (newName: string) => void;
}

export default function EditDeckNameModal({
  isOpen,
  deckId,
  currentName,
  onClose,
  onSuccess,
}: EditDeckNameModalProps) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Le nom ne peut pas être vide');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        throw new Error('Échec de la mise à jour');
      }

      onSuccess(name.trim());
      onClose();
    } catch (err) {
      setError('Erreur lors de la mise à jour du nom');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md border border-zinc-800">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Renommer le deck
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="deck-name" className="block text-zinc-300 text-sm mb-2">
              Nouveau nom
            </label>
            <input
              id="deck-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Nom du deck"
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
