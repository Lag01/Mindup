'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
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

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ maxDecksPerUser: 10, maxTotalUsers: 5 });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<AppSettings>({ maxDecksPerUser: 10, maxTotalUsers: 5 });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Retour au dashboard
          </button>
        </div>

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

        {/* Liste des utilisateurs */}
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Utilisateurs ({users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
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
