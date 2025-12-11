'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import MathText from '@/components/MathText';
import ImageUploader from '@/components/ImageUploader';
import CardContentDisplay from '@/components/CardContentDisplay';
import { useUser } from '@/hooks/useUser';

interface Card {
  id: string;
  front: string;
  back: string;
  frontType: 'TEXT' | 'LATEX';
  backType: 'TEXT' | 'LATEX';
  frontImage: string | null;
  backImage: string | null;
  order: number;
}

interface Deck {
  id: string;
  name: string;
  cards: Card[];
  originalDeckId?: string | null;
}

interface DuplicateLocation {
  cardId: string;
  field: 'front' | 'back';
  order: number;
}

interface DuplicateGroup {
  text: string;
  normalizedText: string;
  locations: DuplicateLocation[];
  count: number;
}

export default function EditDeck() {
  const params = useParams();
  const deckId = params.id as string;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    front: '',
    back: '',
    frontType: 'TEXT' as 'TEXT' | 'LATEX',
    backType: 'TEXT' as 'TEXT' | 'LATEX',
    frontImage: null as string | null,
    backImage: null as string | null,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'detailed' | 'table'>('detailed');
  const [editFrontFieldsVisibility, setEditFrontFieldsVisibility] = useState({
    showText: true,
    showLatex: false,
    showImage: false,
  });
  const [editBackFieldsVisibility, setEditBackFieldsVisibility] = useState({
    showText: true,
    showLatex: false,
    showImage: false,
  });
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [showDuplicatesDetails, setShowDuplicatesDetails] = useState(false);
  const router = useRouter();
  const { isAdmin } = useUser();

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

  // Détection automatique des doublons
  useEffect(() => {
    if (deck?.cards) {
      const detected = detectDuplicates(deck.cards);
      setDuplicates(detected);
    }
  }, [deck?.cards]);

  // Raccourcis clavier pour l'édition
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ignorer si on est dans un input/textarea autre que les champs du formulaire
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && !target.closest('[data-card-form]')) {
        return;
      }

      // Pas de raccourcis si on n'est pas en édition
      if (!editingCard) return;

      // Échap : Annuler
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }

      // Ctrl+Enter : Sauvegarder
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        saveCard();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [editingCard, editForm, saving]);

  // Fonction utilitaire pour normaliser le texte
  const normalizeText = (text: string): string | null => {
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed.toLowerCase() : null;
  };

  // Fonction utilitaire pour ajouter un texte à la map de doublons
  const addToMap = (
    map: Map<string, DuplicateGroup>,
    normalizedText: string,
    originalText: string,
    cardId: string,
    field: 'front' | 'back',
    order: number
  ) => {
    if (!map.has(normalizedText)) {
      map.set(normalizedText, {
        text: originalText,
        normalizedText,
        locations: [],
        count: 0,
      });
    }

    const group = map.get(normalizedText)!;
    group.locations.push({ cardId, field, order });
    group.count++;
  };

  // Fonction de détection des doublons
  const detectDuplicates = (cards: Card[]): DuplicateGroup[] => {
    try {
      if (!cards || !Array.isArray(cards)) {
        console.warn('Invalid cards array provided to detectDuplicates');
        return [];
      }

      const textMap = new Map<string, DuplicateGroup>();

      cards.forEach((card, index) => {
        // Traiter le front
        const frontNorm = normalizeText(card.front);
        if (frontNorm) {
          addToMap(textMap, frontNorm, card.front, card.id, 'front', index + 1);
        }

        // Traiter le back
        const backNorm = normalizeText(card.back);
        if (backNorm) {
          addToMap(textMap, backNorm, card.back, card.id, 'back', index + 1);
        }
      });

      // Filtrer pour garder uniquement les doublons (count >= 2) et trier par count décroissant
      return Array.from(textMap.values())
        .filter(group => group.count >= 2)
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      return [];
    }
  };

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

      // Bloquer l'accès si le deck est importé
      if (data.deck.originalDeckId) {
        alert('Vous ne pouvez pas éditer un deck importé. Il est synchronisé avec le deck public.');
        router.push('/dashboard');
        return;
      }

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
      frontImage: card.frontImage,
      backImage: card.backImage,
    });

    // Initialiser les toggles basés sur le contenu existant de la carte
    const hasFrontText = card.front.trim().length > 0;
    setEditFrontFieldsVisibility({
      showText: card.frontType === 'TEXT' && hasFrontText,
      showLatex: card.frontType === 'LATEX' && hasFrontText,
      showImage: card.frontImage !== null,
    });

    const hasBackText = card.back.trim().length > 0;
    setEditBackFieldsVisibility({
      showText: card.backType === 'TEXT' && hasBackText,
      showLatex: card.backType === 'LATEX' && hasBackText,
      showImage: card.backImage !== null,
    });
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setEditForm({
      front: '',
      back: '',
      frontType: 'TEXT',
      backType: 'TEXT',
      frontImage: null,
      backImage: null,
    });

    // Reset des toggles
    setEditFrontFieldsVisibility({
      showText: true,
      showLatex: false,
      showImage: false,
    });
    setEditBackFieldsVisibility({
      showText: true,
      showLatex: false,
      showImage: false,
    });
  };

  const saveCard = async () => {
    if (!editingCard) return;

    // Valider qu'il y a du contenu
    const hasFrontContent =
      ((editFrontFieldsVisibility.showText || editFrontFieldsVisibility.showLatex) && editForm.front.trim()) ||
      (editFrontFieldsVisibility.showImage && editForm.frontImage);

    const hasBackContent =
      ((editBackFieldsVisibility.showText || editBackFieldsVisibility.showLatex) && editForm.back.trim()) ||
      (editBackFieldsVisibility.showImage && editForm.backImage);

    if (!hasFrontContent || !hasBackContent) {
      alert('⚠️ Le recto et le verso doivent contenir du texte ou une image');
      return;
    }

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

  const swapEditFormFrontBack = () => {
    setEditForm(prev => ({
      front: prev.back,
      back: prev.front,
      frontType: prev.backType,
      backType: prev.frontType,
      frontImage: prev.backImage,
      backImage: prev.frontImage,
    }));

    // Swap des états de visibilité
    const tempFrontVisibility = editFrontFieldsVisibility;
    setEditFrontFieldsVisibility(editBackFieldsVisibility);
    setEditBackFieldsVisibility(tempFrontVisibility);
  };

  // Fonctions helper pour vérifier si on peut désactiver un champ en édition
  const canDisableEditFrontField = () => {
    const { showText, showLatex, showImage } = editFrontFieldsVisibility;
    const activeFieldsCount = [
      showText || showLatex,
      showImage
    ].filter(Boolean).length;
    return activeFieldsCount > 1;
  };

  const canDisableEditBackField = () => {
    const { showText, showLatex, showImage } = editBackFieldsVisibility;
    const activeFieldsCount = [
      showText || showLatex,
      showImage
    ].filter(Boolean).length;
    return activeFieldsCount > 1;
  };

  // Handlers de toggle pour les champs FRONT en édition
  const handleToggleEditFrontText = () => {
    if (editFrontFieldsVisibility.showText && !canDisableEditFrontField()) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    setEditFrontFieldsVisibility(prev => ({
      ...prev,
      showText: !prev.showText,
      showLatex: prev.showText ? prev.showLatex : false,
    }));

    if (!editFrontFieldsVisibility.showText) {
      setEditForm(prev => ({ ...prev, frontType: 'TEXT' }));
    }
  };

  const handleToggleEditFrontLatex = () => {
    if (editFrontFieldsVisibility.showLatex && !canDisableEditFrontField()) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    setEditFrontFieldsVisibility(prev => ({
      ...prev,
      showLatex: !prev.showLatex,
      showText: prev.showLatex ? prev.showText : false,
    }));

    if (!editFrontFieldsVisibility.showLatex) {
      setEditForm(prev => ({ ...prev, frontType: 'LATEX' }));
    }
  };

  const handleToggleEditFrontImage = async () => {
    if (editFrontFieldsVisibility.showImage && !canDisableEditFrontField()) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    // Si on désactive une image existante, la supprimer
    if (editFrontFieldsVisibility.showImage && editForm.frontImage) {
      try {
        await fetch('/api/upload/delete-card-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: editForm.frontImage }),
        });
        setEditForm(prev => ({ ...prev, frontImage: null }));
      } catch (error) {
        console.error('Erreur suppression image:', error);
      }
    }

    setEditFrontFieldsVisibility(prev => ({
      ...prev,
      showImage: !prev.showImage,
    }));
  };

  // Handlers de toggle pour les champs BACK en édition
  const handleToggleEditBackText = () => {
    if (editBackFieldsVisibility.showText && !canDisableEditBackField()) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    setEditBackFieldsVisibility(prev => ({
      ...prev,
      showText: !prev.showText,
      showLatex: prev.showText ? prev.showLatex : false,
    }));

    if (!editBackFieldsVisibility.showText) {
      setEditForm(prev => ({ ...prev, backType: 'TEXT' }));
    }
  };

  const handleToggleEditBackLatex = () => {
    if (editBackFieldsVisibility.showLatex && !canDisableEditBackField()) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    setEditBackFieldsVisibility(prev => ({
      ...prev,
      showLatex: !prev.showLatex,
      showText: prev.showLatex ? prev.showText : false,
    }));

    if (!editBackFieldsVisibility.showLatex) {
      setEditForm(prev => ({ ...prev, backType: 'LATEX' }));
    }
  };

  const handleToggleEditBackImage = async () => {
    if (editBackFieldsVisibility.showImage && !canDisableEditBackField()) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    // Si on désactive une image existante, la supprimer
    if (editBackFieldsVisibility.showImage && editForm.backImage) {
      try {
        await fetch('/api/upload/delete-card-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: editForm.backImage }),
        });
        setEditForm(prev => ({ ...prev, backImage: null }));
      } catch (error) {
        console.error('Erreur suppression image:', error);
      }
    }

    setEditBackFieldsVisibility(prev => ({
      ...prev,
      showImage: !prev.showImage,
    }));
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

  const handleSearchDuplicate = (text: string) => {
    // Remplir la barre de recherche avec le texte original
    setSearchQuery(text);

    // Fermer la section des doublons
    setShowDuplicatesDetails(false);

    // Scroll vers la liste des cartes
    setTimeout(() => {
      const cardsContainer = document.querySelector('[data-cards-list]');
      cardsContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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

        {/* Section d'avertissement des doublons */}
        {duplicates.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="text-amber-400 text-2xl">⚠️</div>
                <div>
                  <h3 className="text-amber-300 font-semibold text-lg">
                    Doublons Détectés
                  </h3>
                  <p className="text-amber-200/70 text-sm mt-1">
                    {duplicates.length} texte{duplicates.length > 1 ? 's' : ''} dupliqué{duplicates.length > 1 ? 's' : ''} dans{' '}
                    {new Set(duplicates.flatMap(d => d.locations.map(l => l.cardId))).size} carte{new Set(duplicates.flatMap(d => d.locations.map(l => l.cardId))).size > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDuplicatesDetails(!showDuplicatesDetails)}
                className="bg-amber-800/30 hover:bg-amber-800/50 text-amber-300 px-4 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
              >
                {showDuplicatesDetails ? 'Masquer ▲' : 'Voir les détails ▼'}
              </button>
            </div>

            {/* Détails (collapsible) */}
            {showDuplicatesDetails && (
              <div className="mt-4 space-y-3">
                {duplicates.map((dup, idx) => {
                  const displayText = dup.text.length > 80
                    ? dup.text.substring(0, 80) + '...'
                    : dup.text;

                  return (
                    <div key={idx} className="bg-zinc-900 border border-amber-700/30 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-zinc-300 font-medium mb-2">
                            📝 "{displayText}"
                          </div>
                          <div className="text-zinc-400 text-sm">
                            Trouvé dans {dup.count} endroit{dup.count > 1 ? 's' : ''} :{' '}
                            {dup.locations.map((loc, i) => (
                              <span key={i}>
                                {i > 0 && ', '}
                                Carte #{loc.order} ({loc.field === 'front' ? 'recto' : 'verso'})
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => handleSearchDuplicate(dup.text)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Chercher
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Add Card Button - Redirige vers la page d'ajout rapide */}
        <div className="mb-6">
          <Link
            href={`/deck/${deckId}/add`}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter une carte
          </Link>
        </div>

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
          <div className="space-y-3" data-cards-list>
            {filteredCards.map((card, index) => {
              // Vérifier si la carte est en doublon
              const isCardDuplicate = duplicates.some(d =>
                d.locations.some(loc => loc.cardId === card.id)
              );

              return (
            <div
              key={card.id}
              className="bg-zinc-900 rounded-lg p-4 border border-zinc-800"
            >
              <div className="flex justify-between items-start mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    Carte {index + 1}
                  </h3>
                  {isCardDuplicate && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-700/50">
                      ⚠️ Doublon
                    </span>
                  )}
                </div>
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
                          onClick={handleToggleEditFrontText}
                          className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                            editFrontFieldsVisibility.showText
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          Texte
                        </button>
                        <button
                          onClick={handleToggleEditFrontLatex}
                          className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                            editFrontFieldsVisibility.showLatex
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          LaTeX
                        </button>
                        {isAdmin && (
                          <button
                            onClick={handleToggleEditFrontImage}
                            className={`px-2.5 py-0.5 rounded text-xs transition-colors flex items-center gap-1 ${
                              editFrontFieldsVisibility.showImage
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

                    {/* Textarea - Affichage conditionnel */}
                    {(editFrontFieldsVisibility.showText || editFrontFieldsVisibility.showLatex) && (
                      <textarea
                        value={editForm.front}
                        onChange={e =>
                          setEditForm(prev => ({ ...prev, front: e.target.value }))
                        }
                        placeholder={editFrontFieldsVisibility.showLatex
                          ? "Entrez du LaTeX..."
                          : "Entrez le recto..."}
                        className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    )}

                    {/* Aperçu LaTeX */}
                    {editForm.front && editFrontFieldsVisibility.showLatex && (
                      <div className="mt-1.5 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                        <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
                        <MathText
                          text={editForm.front}
                          contentType="LATEX"
                          autoResize={false}
                          className="text-foreground"
                        />
                      </div>
                    )}

                    {/* Upload image recto - Affichage conditionnel */}
                    {isAdmin && editFrontFieldsVisibility.showImage && (
                      <div className="mt-2">
                        <ImageUploader
                          currentImage={editForm.frontImage}
                          onImageUploaded={(path) => setEditForm(prev => ({ ...prev, frontImage: path }))}
                          onImageRemoved={() => setEditForm(prev => ({ ...prev, frontImage: null }))}
                          label="Recto"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bouton d'inversion */}
                  <div className="flex justify-center -my-2">
                    <button
                      type="button"
                      onClick={swapEditFormFrontBack}
                      disabled={saving}
                      className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 p-2 rounded-lg transition-colors disabled:opacity-50 group"
                      title="Inverser le recto et le verso"
                    >
                      <svg className="w-5 h-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>
                  </div>

                  {/* Back */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-300 font-medium text-sm">Verso</label>
                      <div className="flex gap-2">
                        <button
                          onClick={handleToggleEditBackText}
                          className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                            editBackFieldsVisibility.showText
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          Texte
                        </button>
                        <button
                          onClick={handleToggleEditBackLatex}
                          className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                            editBackFieldsVisibility.showLatex
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          LaTeX
                        </button>
                        {isAdmin && (
                          <button
                            onClick={handleToggleEditBackImage}
                            className={`px-2.5 py-0.5 rounded text-xs transition-colors flex items-center gap-1 ${
                              editBackFieldsVisibility.showImage
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

                    {/* Textarea - Affichage conditionnel */}
                    {(editBackFieldsVisibility.showText || editBackFieldsVisibility.showLatex) && (
                      <textarea
                        value={editForm.back}
                        onChange={e =>
                          setEditForm(prev => ({ ...prev, back: e.target.value }))
                        }
                        placeholder={editBackFieldsVisibility.showLatex
                          ? "Entrez du LaTeX..."
                          : "Entrez le verso..."}
                        className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    )}

                    {/* Aperçu LaTeX */}
                    {editForm.back && editBackFieldsVisibility.showLatex && (
                      <div className="mt-1.5 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                        <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
                        <MathText
                          text={editForm.back}
                          contentType="LATEX"
                          autoResize={false}
                          className="text-foreground"
                        />
                      </div>
                    )}

                    {/* Upload image verso - Affichage conditionnel */}
                    {isAdmin && editBackFieldsVisibility.showImage && (
                      <div className="mt-2">
                        <ImageUploader
                          currentImage={editForm.backImage}
                          onImageUploaded={(path) => setEditForm(prev => ({ ...prev, backImage: path }))}
                          onImageRemoved={() => setEditForm(prev => ({ ...prev, backImage: null }))}
                          label="Verso"
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
                      {card.frontImage && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50">
                          + Image
                        </span>
                      )}
                    </div>
                    <div className="p-4 bg-zinc-800 rounded-lg">
                      <CardContentDisplay
                        text={card.front}
                        textType={card.frontType}
                        imagePath={card.frontImage}
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
                      {card.backImage && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50">
                          + Image
                        </span>
                      )}
                    </div>
                    <div className="p-4 bg-zinc-800 rounded-lg">
                      <CardContentDisplay
                        text={card.back}
                        textType={card.backType}
                        imagePath={card.backImage}
                        autoResize={false}
                        className="text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
              );
            })}
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
