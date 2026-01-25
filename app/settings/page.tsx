'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

export default function SettingsPage() {
  const router = useRouter();
  const {
    supported,
    permission,
    preferences,
    loading: notifLoading,
    error: notifError,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
  } = useNotifications();

  // États locaux pour les modifications avant sauvegarde
  const [webPushEnabled, setWebPushEnabled] = useState(false);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [motivationAlerts, setMotivationAlerts] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger les préférences initiales
  useEffect(() => {
    if (preferences) {
      setWebPushEnabled(preferences.webPushEnabled);
      setStreakAlerts(preferences.streakAlerts);
      setMotivationAlerts(preferences.motivationAlerts);
    }
  }, [preferences]);

  // Gérer l'activation/désactivation des notifications Web Push
  const handleWebPushToggle = async (enabled: boolean) => {
    setError('');
    setSuccess('');

    if (enabled) {
      try {
        // Vérifier le support
        if (!supported) {
          setError('Les notifications ne sont pas supportées par ce navigateur');
          return;
        }

        // Demander la permission si pas déjà accordée
        if (permission !== 'granted') {
          await requestPermission();
        }

        // S'abonner
        await subscribe();
        setWebPushEnabled(true);
        setSuccess('Notifications activées avec succès');
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'activation des notifications');
        setWebPushEnabled(false);
      }
    } else {
      try {
        // Se désabonner
        await unsubscribe();
        setWebPushEnabled(false);
        setSuccess('Notifications désactivées');
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la désactivation des notifications');
      }
    }
  };

  // Sauvegarder les préférences
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updatePreferences({
        streakAlerts,
        motivationAlerts,
      });

      setSuccess('Préférences enregistrées avec succès');

      // Retourner au dashboard après 1.5s
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde des préférences');
    } finally {
      setSaving(false);
    }
  };

  // Vérifier si les préférences ont changé
  const hasChanges = () => {
    if (!preferences) return false;
    return (
      streakAlerts !== preferences.streakAlerts ||
      motivationAlerts !== preferences.motivationAlerts
    );
  };

  if (notifLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-zinc-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
            <p className="text-zinc-400 text-sm mt-1">Gérez vos notifications</p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          {/* Section Notifications Web Push */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Notifications Web Push</h2>

            {/* Avertissement si non supporté */}
            {!supported && (
              <div className="mb-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <p className="text-amber-400 text-sm">
                  ⚠️ Les notifications ne sont pas supportées par ce navigateur.
                  {typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
                    <span className="block mt-2">
                      Sur iOS, vous devez installer l&apos;application sur votre écran d&apos;accueil pour activer les notifications.
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Toggle principal */}
            <label className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg cursor-pointer mb-4">
              <div className="flex-1">
                <div className="font-medium text-foreground mb-1">
                  Activer les notifications Web Push
                </div>
                <div className="text-sm text-zinc-400">
                  Recevoir une notification quotidienne à 18h pour rester motivé
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={webPushEnabled}
                  onChange={(e) => handleWebPushToggle(e.target.checked)}
                  disabled={!supported}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-blue-600 peer-disabled:opacity-50 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>

            {/* Options de notifications (visibles seulement si webPushEnabled) */}
            {webPushEnabled && (
              <div className="space-y-3 pl-4 border-l-2 border-zinc-700">
                <div className="mb-3 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <p className="text-blue-400 text-xs">
                    💡 Les notifications sont envoyées automatiquement à 18h chaque jour si tu n&apos;as pas encore révisé.
                  </p>
                </div>

                {/* Alertes de streak en danger */}
                <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer">
                  <div className="flex-1">
                    <div className="font-medium text-foreground text-sm mb-1">
                      Alertes de streak
                    </div>
                    <div className="text-xs text-zinc-400">
                      Messages pour continuer ton streak actif
                    </div>
                  </div>
                  <div className="relative ml-3">
                    <input
                      type="checkbox"
                      checked={streakAlerts}
                      onChange={(e) => setStreakAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                </label>

                {/* Messages de motivation */}
                <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer">
                  <div className="flex-1">
                    <div className="font-medium text-foreground text-sm mb-1">
                      Messages de motivation
                    </div>
                    <div className="text-xs text-zinc-400">
                      Recevoir des messages pour te motiver à réviser
                    </div>
                  </div>
                  <div className="relative ml-3">
                    <input
                      type="checkbox"
                      checked={motivationAlerts}
                      onChange={(e) => setMotivationAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Messages d'erreur et succès */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {notifError && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <p className="text-red-400 text-sm">{notifError}</p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
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
