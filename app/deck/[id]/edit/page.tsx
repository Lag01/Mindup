'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MathText from '@/components/MathText';

interface Card {
  id: string;
  front: string;
  back: string;
  frontType: 'TEXT' | 'LATEX';
  backType: 'TEXT' | 'LATEX';
  order: number;
}

interface Deck {
  id: string;
  name: string;
  cards: Card[];
}

export default function EditDeck() {
  const params = useParams();
  const deckId = params.id as string;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [creatingCard, setCreatingCard] = useState(false);
  const [editForm, setEditForm] = useState({
    front: '',
    back: '',
    frontType: 'TEXT' as 'TEXT' | 'LATEX',
    backType: 'TEXT' as 'TEXT' | 'LATEX',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDeck();
  }, [deckId]);

  const fetchDeck = async () => {
    try {
      const response = await fetch(`/api/decks/${deckId}/cards`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch deck');
      }
      const data = await response.json();
      setDeck(data.deck);
    } catch (error) {
      console.error('Error fetching deck:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (card: Card) => {
    setEditingCard(card.id);
    setEditForm({
      front: card.front,
      back: card.back,
      frontType: card.frontType,
      backType: card.backType,
    });
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setEditForm({
      front: '',
      back: '',
      frontType: 'TEXT',
      backType: 'TEXT',
    });
  };

  const saveCard = async () => {
    if (!editingCard) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/cards/${editingCard}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update card');
      }

      const data = await response.json();

      // Update local state
      setDeck(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map(card =>
            card.id === editingCard ? data.card : card
          ),
        };
      });

      cancelEdit();
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Erreur lors de la mise à jour de la carte');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpdate = async (updateFront: boolean, updateBack: boolean, targetType: 'TEXT' | 'LATEX') => {
    const action = updateFront && updateBack ? 'tous les rectos ET versos' : updateFront ? 'tous les rectos' : 'tous les versos';
    if (!confirm(`Êtes-vous sûr de vouloir changer ${action} en ${targetType} ?`)) {
      return;
    }

    setBulkUpdating(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/bulk-update-types`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updateFront, updateBack, targetType }),
      });

      if (!response.ok) {
        throw new Error('Failed to bulk update');
      }

      // Refresh the deck data
      await fetchDeck();
      alert('Mise à jour effectuée avec succès !');
    } catch (error) {
      console.error('Error bulk updating:', error);
      alert('Erreur lors de la mise à jour en masse');
    } finally {
      setBulkUpdating(false);
    }
  };

  const startCreate = () => {
    setCreatingCard(true);
    setEditForm({
      front: '',
      back: '',
      frontType: 'TEXT',
      backType: 'TEXT',
    });
  };

  const cancelCreate = () => {
    setCreatingCard(false);
    setEditForm({
      front: '',
      back: '',
      frontType: 'TEXT',
      backType: 'TEXT',
    });
  };

  const createCard = async () => {
    if (!editForm.front.trim() || !editForm.back.trim()) {
      alert('Le recto et le verso sont requis');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to create card');
      }

      // Refresh the deck data
      await fetchDeck();
      cancelCreate();
    } catch (error) {
      console.error('Error creating card:', error);
      alert('Erreur lors de la création de la carte');
    } finally {
      setSaving(false);
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
      return;
    }

    setDeleting(cardId);
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete card');
      }

      // Update local state
      setDeck(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.filter(card => card.id !== cardId),
        };
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Erreur lors de la suppression de la carte');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground text-lg">Chargement...</div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground text-lg">Deck non trouvé</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            Éditer : {deck.name}
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Bulk Actions Section */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Actions en masse
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Changer le type de formatage de toutes les cartes du deck en une seule fois.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Front cards bulk update */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <h3 className="text-zinc-300 font-medium mb-3">Tous les rectos</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkUpdate(true, false, 'TEXT')}
                  disabled={bulkUpdating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  → Texte
                </button>
                <button
                  onClick={() => handleBulkUpdate(true, false, 'LATEX')}
                  disabled={bulkUpdating}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  → LaTeX
                </button>
              </div>
            </div>

            {/* Back cards bulk update */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <h3 className="text-zinc-300 font-medium mb-3">Tous les versos</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkUpdate(false, true, 'TEXT')}
                  disabled={bulkUpdating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  → Texte
                </button>
                <button
                  onClick={() => handleBulkUpdate(false, true, 'LATEX')}
                  disabled={bulkUpdating}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  → LaTeX
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Card Button */}
        <div className="mb-6">
          {!creatingCard && (
            <button
              onClick={startCreate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajouter une carte
            </button>
          )}
        </div>

        {/* Create Card Form */}
        {creatingCard && (
          <div className="bg-zinc-900 rounded-lg p-6 border-2 border-blue-600 mb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Nouvelle carte
              </h3>
            </div>

            <div className="space-y-4">
              {/* Front */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-zinc-300 font-medium">Recto</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setEditForm(prev => ({
                          ...prev,
                          frontType: 'TEXT',
                        }))
                      }
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        editForm.frontType === 'TEXT'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Texte
                    </button>
                    <button
                      onClick={() =>
                        setEditForm(prev => ({
                          ...prev,
                          frontType: 'LATEX',
                        }))
                      }
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        editForm.frontType === 'LATEX'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      LaTeX
                    </button>
                  </div>
                </div>
                <textarea
                  value={editForm.front}
                  onChange={e =>
                    setEditForm(prev => ({ ...prev, front: e.target.value }))
                  }
                  placeholder="Entrez le recto de la carte..."
                  className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {editForm.front && (
                  <div className="mt-2 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="text-zinc-400 text-xs mb-2">Aperçu :</div>
                    <MathText
                      text={editForm.front}
                      contentType={editForm.frontType}
                      autoResize={false}
                      className="text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Back */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-zinc-300 font-medium">Verso</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setEditForm(prev => ({
                          ...prev,
                          backType: 'TEXT',
                        }))
                      }
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        editForm.backType === 'TEXT'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Texte
                    </button>
                    <button
                      onClick={() =>
                        setEditForm(prev => ({
                          ...prev,
                          backType: 'LATEX',
                        }))
                      }
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        editForm.backType === 'LATEX'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      LaTeX
                    </button>
                  </div>
                </div>
                <textarea
                  value={editForm.back}
                  onChange={e =>
                    setEditForm(prev => ({ ...prev, back: e.target.value }))
                  }
                  placeholder="Entrez le verso de la carte..."
                  className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {editForm.back && (
                  <div className="mt-2 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="text-zinc-400 text-xs mb-2">Aperçu :</div>
                    <MathText
                      text={editForm.back}
                      contentType={editForm.backType}
                      autoResize={false}
                      className="text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelCreate}
                  disabled={saving}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={createCard}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Création...' : 'Créer la carte'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cards List */}
        <div className="space-y-4">
          {deck.cards.map((card, index) => (
            <div
              key={card.id}
              className="bg-zinc-900 rounded-lg p-6 border border-zinc-800"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Carte {index + 1}
                </h3>
                {editingCard !== card.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(card)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      disabled={deleting === card.id}
                      className="bg-red-900/30 hover:bg-red-900/50 text-red-400 font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                    >
                      {deleting === card.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                )}
              </div>

              {editingCard === card.id ? (
                // Edit mode
                <div className="space-y-4">
                  {/* Front */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-zinc-300 font-medium">Recto</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditForm(prev => ({
                              ...prev,
                              frontType: 'TEXT',
                            }))
                          }
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            editForm.frontType === 'TEXT'
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          Texte
                        </button>
                        <button
                          onClick={() =>
                            setEditForm(prev => ({
                              ...prev,
                              frontType: 'LATEX',
                            }))
                          }
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            editForm.frontType === 'LATEX'
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          LaTeX
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editForm.front}
                      onChange={e =>
                        setEditForm(prev => ({ ...prev, front: e.target.value }))
                      }
                      className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="mt-2 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                      <div className="text-zinc-400 text-xs mb-2">Aperçu :</div>
                      <MathText
                        text={editForm.front}
                        contentType={editForm.frontType}
                        autoResize={false}
                        className="text-foreground"
                      />
                    </div>
                  </div>

                  {/* Back */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-zinc-300 font-medium">Verso</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditForm(prev => ({
                              ...prev,
                              backType: 'TEXT',
                            }))
                          }
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            editForm.backType === 'TEXT'
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          Texte
                        </button>
                        <button
                          onClick={() =>
                            setEditForm(prev => ({
                              ...prev,
                              backType: 'LATEX',
                            }))
                          }
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            editForm.backType === 'LATEX'
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          LaTeX
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editForm.back}
                      onChange={e =>
                        setEditForm(prev => ({ ...prev, back: e.target.value }))
                      }
                      className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="mt-2 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                      <div className="text-zinc-400 text-xs mb-2">Aperçu :</div>
                      <MathText
                        text={editForm.back}
                        contentType={editForm.backType}
                        autoResize={false}
                        className="text-foreground"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={saveCard}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-zinc-400 text-sm">Recto</div>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {card.frontType === 'LATEX' ? 'LaTeX' : 'Texte'}
                      </span>
                    </div>
                    <div className="p-4 bg-zinc-800 rounded-lg">
                      <MathText
                        text={card.front}
                        contentType={card.frontType}
                        autoResize={false}
                        className="text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-zinc-400 text-sm">Verso</div>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {card.backType === 'LATEX' ? 'LaTeX' : 'Texte'}
                      </span>
                    </div>
                    <div className="p-4 bg-zinc-800 rounded-lg">
                      <MathText
                        text={card.back}
                        contentType={card.backType}
                        autoResize={false}
                        className="text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
