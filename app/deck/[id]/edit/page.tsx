'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'detailed' | 'table'>('detailed');
  const router = useRouter();
  const frontInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchDeck();
  }, [deckId]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ignorer si on est dans un input/textarea autre que les champs du formulaire
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && !target.closest('[data-card-form]')) {
        return;
      }

      // Pas de raccourcis si on n'est ni en création ni en édition
      if (!creatingCard && !editingCard) return;

      // Échap : Annuler
      if (e.key === 'Escape') {
        e.preventDefault();
        if (creatingCard) cancelCreate();
        if (editingCard) cancelEdit();
      }

      // Ctrl+Enter : Sauvegarder
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (creatingCard) {
          // Shift+Ctrl+Enter : Créer et continuer
          if (e.shiftKey) {
            createCardAndContinue();
          } else {
            createCard();
          }
        }
        if (editingCard) saveCard();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [creatingCard, editingCard, editForm, saving]);

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

  const handleSwapAll = async () => {
    const cardCount = deck?.cards.length || 0;
    if (!confirm(`Voulez-vous inverser le recto et le verso de toutes les cartes (${cardCount} carte${cardCount > 1 ? 's' : ''}) ?\n\nCette action est réversible en cliquant à nouveau sur ce bouton.`)) {
      return;
    }

    setBulkUpdating(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/swap-all`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to swap cards');
      }

      // Refresh the deck data
      await fetchDeck();
      alert('Inversion effectuée avec succès !');
    } catch (error) {
      console.error('Error swapping cards:', error);
      alert('Erreur lors de l\'inversion des cartes');
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
    // Focus automatique sur le champ recto
    setTimeout(() => frontInputRef.current?.focus(), 100);
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

  const createCardAndContinue = async () => {
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

      // Réinitialiser le formulaire mais garder le mode création actif
      setEditForm({
        front: '',
        back: '',
        frontType: 'TEXT',
        backType: 'TEXT',
      });

      // Focus automatique sur le champ recto
      setTimeout(() => frontInputRef.current?.focus(), 100);
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

  const handleExport = async (format: 'xml' | 'csv') => {
    try {
      const response = await fetch(`/api/decks/${deckId}/export?format=${format}`);

      if (!response.ok) {
        throw new Error('Failed to export deck');
      }

      // Créer un blob à partir de la réponse
      const blob = await response.blob();

      // Créer un lien temporaire pour télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extraire le nom du fichier depuis les headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `deck.${format}`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Nettoyer
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting deck:', error);
      alert('Erreur lors de l\'export du deck');
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

  // Filtrer les cartes selon la recherche (recto ou verso)
  const filteredCards = deck.cards.filter(card =>
    card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.back.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4 gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
              Éditer : {deck.name}
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-3 py-2 sm:px-4 rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              <span className="hidden sm:inline">Retour au dashboard</span>
              <span className="sm:hidden">Retour</span>
            </button>
          </div>

          {/* Barre de recherche */}
          {deck.cards.length > 0 && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Rechercher une carte (recto ou verso)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
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

          {/* Swap all cards */}
          <div className="mt-4 bg-zinc-800 rounded-lg p-4 border border-zinc-700">
            <h3 className="text-zinc-300 font-medium mb-3">Inverser toutes les cartes</h3>
            <p className="text-zinc-400 text-sm mb-3">
              Échange le recto et le verso de toutes les cartes du deck (les types de formatage sont également inversés).
            </p>
            <button
              onClick={handleSwapAll}
              disabled={bulkUpdating || !deck || deck.cards.length === 0}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Inverser recto ↔ verso
            </button>
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
          <div className="bg-zinc-900 rounded-lg p-4 border-2 border-blue-600 mb-4" data-card-form>
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-foreground">
                Nouvelle carte
              </h3>
            </div>

            <div className="space-y-3">
              {/* Front */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-medium text-sm">Recto</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setEditForm(prev => ({
                          ...prev,
                          frontType: 'TEXT',
                        }))
                      }
                      className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
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
                      className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
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
                  ref={frontInputRef}
                  value={editForm.front}
                  onChange={e =>
                    setEditForm(prev => ({ ...prev, front: e.target.value }))
                  }
                  placeholder="Entrez le recto de la carte..."
                  className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {editForm.front && editForm.frontType === 'LATEX' && (
                  <div className="mt-1.5 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-medium text-sm">Verso</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setEditForm(prev => ({
                          ...prev,
                          backType: 'TEXT',
                        }))
                      }
                      className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
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
                      className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
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
                  className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {editForm.back && editForm.backType === 'LATEX' && (
                  <div className="mt-1.5 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
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
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button
                    onClick={cancelCreate}
                    disabled={saving}
                    className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm order-3 sm:order-1"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createCardAndContinue}
                    disabled={saving}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-1.5 order-1 sm:order-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="hidden sm:inline">{saving ? 'Création...' : 'Ajouter et continuer'}</span>
                    <span className="sm:hidden">{saving ? 'Création...' : 'Ajouter + continuer'}</span>
                  </button>
                  <button
                    onClick={createCard}
                    disabled={saving}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm order-2 sm:order-3"
                  >
                    {saving ? 'Création...' : 'Ajouter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cards List */}
        {filteredCards.length === 0 && deck.cards.length > 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg mb-4">
              Aucune carte trouvée pour "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Effacer la recherche
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCards.map((card, index) => (
            <div
              key={card.id}
              className="bg-zinc-900 rounded-lg p-4 border border-zinc-800"
            >
              <div className="flex justify-between items-start mb-4 gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Carte {index + 1}
                </h3>
                {editingCard !== card.id && (
                  <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(card)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm whitespace-nowrap"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      disabled={deleting === card.id}
                      className="bg-red-900/30 hover:bg-red-900/50 text-red-400 font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      {deleting === card.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                )}
              </div>

              {editingCard === card.id ? (
                // Edit mode
                <div className="space-y-3" data-card-form>
                  {/* Front */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-300 font-medium text-sm">Recto</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditForm(prev => ({
                              ...prev,
                              frontType: 'TEXT',
                            }))
                          }
                          className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
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
                          className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
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
                      className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {editForm.front && editForm.frontType === 'LATEX' && (
                      <div className="mt-1.5 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                        <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-300 font-medium text-sm">Verso</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditForm(prev => ({
                              ...prev,
                              backType: 'TEXT',
                            }))
                          }
                          className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
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
                          className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
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
                      className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {editForm.back && editForm.backType === 'LATEX' && (
                      <div className="mt-1.5 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                        <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
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
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm order-2 sm:order-1"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={saveCard}
                        disabled={saving}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm order-1 sm:order-2"
                      >
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </div>
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
        )}
      </main>

      {/* Bouton retour en haut */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 sm:p-4 rounded-full shadow-lg transition-all duration-300 z-50 flex items-center justify-center"
          aria-label="Retour en haut"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
