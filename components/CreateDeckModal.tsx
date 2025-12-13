'use client';

import { useState } from 'react';
import BaseModal from './Modal/BaseModal';

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
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Échec de la création');
      }

      const data = await response.json();
      onSuccess(data.deck);
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du deck');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title="Créer un nouveau deck"
      inputLabel="Nom du deck"
      inputPlaceholder="Entrez le nom du deck..."
      inputValue={name}
      onInputChange={setName}
      submitButtonText="Créer"
      submitButtonLoadingText="Création..."
      onSubmit={handleSubmit}
      onClose={handleClose}
      isSubmitting={creating}
      error={error}
      maxLength={100}
    />
  );
}
