'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimpleHeader from '@/components/SimpleHeader';
import LoadingAnimation from '@/components/LoadingAnimation';

interface User {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
  decksCount: number;
  reviewsCount: number;
  reviewedCardsCount: number;
}

interface AppSettings {
  maxDecksPerUser: number;
  maxTotalUsers: number;
}

interface AdminDeck {
  id: string;
  name: string;
  totalCards: number;
  isPublic: boolean;
  importCount: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ maxDecksPerUser: 10, maxTotalUsers: 5 });
  const [adminDecks, setAdminDecks] = useState<AdminDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [editedSettings, setEditedSettings] = useState<AppSettings>({ maxDecksPerUser: 10, maxTotalUsers: 5 });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedDisplayName, setEditedDisplayName] = useState<string>('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Récupérer les utilisateurs
      const usersResponse = await fetch('/api/admin/users');
      if (!usersResponse.ok) {
        if (usersResponse.status === 403) {
          alert('Accès refusé : droits administrateur requis');
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch users');
      }
      const usersData = await usersResponse.json();
      setUsers(usersData.users);

      // Récupérer les paramètres
      const settingsResponse = await fetch('/api/admin/settings');
      if (!settingsResponse.ok) {
        throw new Error('Failed to fetch settings');
      }
      const settingsData = await settingsResponse.json();
      setSettings(settingsData.settings);
      setEditedSettings(settingsData.settings);

      // Récupérer les decks de l'admin
      const decksResponse = await fetch('/api/decks');
      if (decksResponse.ok) {
        const decksData = await decksResponse.json();
        setAdminDecks(decksData.decks);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userEmail} ? Tous ses decks et cartes seront supprimés.`)) {
      return;
    }

    setDeleting(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      setUsers(users.filter(u => u.id !== userId));
      alert('Utilisateur supprimé avec succès');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedSettings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      alert('Paramètres mis à jour avec succès');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishDeck = async (deckId: string) => {
    setPublishing(deckId);
    try {
      const response = await fetch(`/api/admin/decks/${deckId}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la publication du deck');
      }

      // Rafraîchir la liste des decks
      await fetchData();
      alert('Deck publié avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de la publication:', error);
      alert(error.message || 'Erreur lors de la publication du deck');
    } finally {
      setPublishing(null);
    }
  };

  const handleUnpublishDeck = async (deckId: string, importCount: number) => {
    if (!confirm(`Êtes-vous sûr de vouloir dépublier ce deck ? ${importCount} utilisateur(s) ont importé ce deck et il sera supprimé de leur profil.`)) {
      return;
    }

    setPublishing(deckId);
    try {
      const response = await fetch(`/api/admin/decks/${deckId}/unpublish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la dépublication du deck');
      }

      // Rafraîchir la liste des decks
      await fetchData();
      alert('Deck dépublié avec succès et retiré de tous les profils !');
    } catch (error: any) {
      console.error('Erreur lors de la dépublication:', error);
      alert(error.message || 'Erreur lors de la dépublication du deck');
    } finally {
      setPublishing(null);
    }
  };

  const handleUpdateDisplayName = async (userId: string, currentDisplayName: string) => {
    if (editedDisplayName.trim() === currentDisplayName) {
      setEditingUserId(null);
      return;
    }

    setSavingDisplayName(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/display-name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editedDisplayName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour du pseudo');
      }

      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, displayName: editedDisplayName.trim() }
          : u
      ));

      setEditingUserId(null);
      alert('Pseudo mis à jour avec succès');
    } catch (error) {
      console.error('Error updating display name:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du pseudo');
    } finally {
      setSavingDisplayName(false);
    }
  };

  const handleStartEditDisplayName = (userId: string, currentDisplayName: string) => {
    setEditingUserId(userId);
    setEditedDisplayName(currentDisplayName);
  };

  const handleCancelEditDisplayName = () => {
    setEditingUserId(null);
    setEditedDisplayName('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SimpleHeader
        title="Tableau de bord administrateur"
        backButton={{ label: "Retour au dashboard", href: "/dashboard" }}
      />

      <div className="max-w-7xl mx-auto p-8">

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Utilisateurs inscrits</div>
            <div className="text-3xl font-bold">
              {users.length} / {settings.maxTotalUsers}
            </div>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Total de decks</div>
            <div className="text-3xl font-bold">
              {users.reduce((sum, u) => sum + u.decksCount, 0)}
            </div>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Total de révisions</div>
            <div className="text-3xl font-bold">
              {users.reduce((sum, u) => sum + u.reviewsCount, 0)}
            </div>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Cartes révisées (total)</div>
            <div className="text-3xl font-bold">
              {users.reduce((sum, u) => sum + u.reviewedCardsCount, 0)}
            </div>
          </div>
        </div>

        {/* Paramètres */}
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 mb-8">
          <h2 className="text-xl font-bold mb-4">Paramètres de l'application</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Nombre maximum de decks par utilisateur
              </label>
              <input
                type="number"
                min="1"
                value={editedSettings.maxDecksPerUser}
                onChange={(e) => setEditedSettings({
                  ...editedSettings,
                  maxDecksPerUser: parseInt(e.target.value) || 1
                })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Nombre maximum d'utilisateurs total
              </label>
              <input
                type="number"
                min="1"
                value={editedSettings.maxTotalUsers}
                onChange={(e) => setEditedSettings({
                  ...editedSettings,
                  maxTotalUsers: parseInt(e.target.value) || 1
                })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
          </button>
        </div>

        {/* Gestion des Decks Publics */}
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 mb-8">
          <h2 className="text-xl font-bold mb-4">Gestion des Decks Publics</h2>
          {adminDecks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Vous n'avez pas encore de decks
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Nom du deck</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Cartes</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Statut</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Importations</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminDecks.map((deck) => (
                    <tr key={deck.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4">{deck.name}</td>
                      <td className="py-3 px-4">{deck.totalCards}</td>
                      <td className="py-3 px-4">
                        {deck.isPublic ? (
                          <span className="inline-block px-2 py-1 bg-green-900 text-green-200 rounded text-xs">
                            Public
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                            Privé
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">{deck.importCount}</td>
                      <td className="py-3 px-4">
                        {deck.isPublic ? (
                          <button
                            onClick={() => handleUnpublishDeck(deck.id, deck.importCount)}
                            disabled={publishing === deck.id}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
                          >
                            {publishing === deck.id ? 'Dépublication...' : 'Dépublier'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePublishDeck(deck.id)}
                            disabled={publishing === deck.id}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
                          >
                            {publishing === deck.id ? 'Publication...' : 'Publier'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Liste des utilisateurs */}
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Utilisateurs ({users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Pseudo</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Rôle</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Inscrit le</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Decks</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Révisions</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Cartes révisées</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">
                      {editingUserId === user.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editedDisplayName}
                            onChange={(e) => setEditedDisplayName(e.target.value)}
                            maxLength={50}
                            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateDisplayName(user.id, user.displayName)}
                            disabled={savingDisplayName}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-xs"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEditDisplayName}
                            disabled={savingDisplayName}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{user.displayName}</span>
                          <button
                            onClick={() => handleStartEditDisplayName(user.id, user.displayName)}
                            className="text-gray-400 hover:text-blue-400 text-xs"
                            title="Modifier le pseudo"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user.isAdmin ? (
                        <span className="inline-block px-2 py-1 bg-purple-900 text-purple-200 rounded text-xs">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                          Utilisateur
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{formatDate(user.createdAt)}</td>
                    <td className="py-3 px-4">{user.decksCount}</td>
                    <td className="py-3 px-4">{user.reviewsCount}</td>
                    <td className="py-3 px-4">{user.reviewedCardsCount}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={deleting === user.id}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
                      >
                        {deleting === user.id ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
