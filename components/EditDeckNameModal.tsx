'use client';

import { useState } from 'react';
import BaseModal from './Modal/BaseModal';

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

  return (
    <BaseModal
      isOpen={isOpen}
      title="Renommer le deck"
      inputLabel="Nouveau nom"
      inputPlaceholder="Nom du deck"
      inputValue={name}
      onInputChange={setName}
      submitButtonText="Enregistrer"
      submitButtonLoadingText="Enregistrement..."
      onSubmit={handleSubmit}
      onClose={onClose}
      isSubmitting={saving}
      error={error}
    />
  );
}
