import { useState, useEffect, useCallback } from 'react';
import {
  areNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/lib/notifications.client';

export interface NotificationPreferences {
  webPushEnabled: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string;
  streakAlerts: boolean;
  motivationAlerts: boolean;
}

export interface UseNotificationsReturn {
  // État
  supported: boolean;
  permission: NotificationPermission;
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;

  // Actions
  requestPermission: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vérifier le support et charger les préférences au montage
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Vérifier le support
        const isSupported = areNotificationsSupported();
        setSupported(isSupported);

        if (isSupported) {
          // Récupérer l'état de la permission
          const currentPermission = getNotificationPermission();
          setPermission(currentPermission);
        }

        // Charger les préférences depuis l'API
        await fetchPreferences();
      } catch (err) {
        console.error('Error initializing notifications:', err);
        setError('Erreur lors de l\'initialisation des notifications');
      } finally {
        setLoading(false);
      }
    };

    initializeNotifications();
  }, []);

  // Récupérer les préférences depuis l'API
  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      console.error('Error fetching preferences:', err);
      throw err;
    }
  };

  // Demander la permission
  const requestPermission = useCallback(async () => {
    try {
      setError(null);

      if (!supported) {
        throw new Error('Les notifications ne sont pas supportées par ce navigateur');
      }

      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === 'denied') {
        throw new Error('Permission de notifications refusée. Veuillez l\'autoriser dans les paramètres de votre navigateur.');
      }
    } catch (err: any) {
      console.error('Error requesting permission:', err);
      setError(err.message || 'Erreur lors de la demande de permission');
      throw err;
    }
  }, [supported]);

  // S'abonner aux notifications
  const subscribe = useCallback(async () => {
    try {
      setError(null);

      if (!supported) {
        throw new Error('Les notifications ne sont pas supportées par ce navigateur');
      }

      if (permission !== 'granted') {
        throw new Error('Permission de notifications non accordée. Veuillez d\'abord accepter les notifications.');
      }

      // Créer la subscription côté client
      const subscription = await subscribeToPushNotifications();

      // Envoyer au serveur
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'abonnement');
      }

      // Rafraîchir les préférences
      await fetchPreferences();
    } catch (err: any) {
      console.error('Error subscribing:', err);
      setError(err.message || 'Erreur lors de l\'abonnement aux notifications');
      throw err;
    }
  }, [supported, permission]);

  // Se désabonner des notifications
  const unsubscribe = useCallback(async () => {
    try {
      setError(null);

      // Désabonner côté client
      await unsubscribeFromPushNotifications();

      // Informer le serveur
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du désabonnement');
      }

      // Rafraîchir les préférences
      await fetchPreferences();
    } catch (err: any) {
      console.error('Error unsubscribing:', err);
      setError(err.message || 'Erreur lors du désabonnement');
      throw err;
    }
  }, []);

  // Mettre à jour les préférences
  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    try {
      setError(null);

      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour des préférences');
      }

      // Rafraîchir les préférences
      await fetchPreferences();
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setError(err.message || 'Erreur lors de la mise à jour des préférences');
      throw err;
    }
  }, []);

  // Rafraîchir les préférences manuellement
  const refreshPreferences = useCallback(async () => {
    try {
      setError(null);
      await fetchPreferences();
    } catch (err: any) {
      console.error('Error refreshing preferences:', err);
      setError(err.message || 'Erreur lors du rafraîchissement des préférences');
      throw err;
    }
  }, []);

  return {
    supported,
    permission,
    preferences,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
    refreshPreferences,
  };
}
