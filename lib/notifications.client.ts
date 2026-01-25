import type { PushSubscriptionJSON } from './notifications.types';

// ============================================================================
// Côté Client - Gestion des Subscriptions
// ============================================================================

/**
 * Vérifie si les notifications sont supportées par le navigateur
 */
export function areNotificationsSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Retourne l'état actuel de la permission de notifications
 */
export function getNotificationPermission(): NotificationPermission {
  if (!areNotificationsSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Demande la permission pour afficher des notifications
 * @returns La permission accordée ('granted', 'denied', ou 'default')
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Demander la permission
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * S'abonne aux notifications push
 * @returns La subscription créée
 */
export async function subscribeToPushNotifications(): Promise<PushSubscriptionJSON> {
  if (!areNotificationsSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  // Vérifier la permission
  if (Notification.permission !== 'granted') {
    throw new Error('Notification permission not granted. Call requestNotificationPermission() first.');
  }

  // Récupérer ou enregistrer le service worker
  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Service Worker not ready:', error);
    throw new Error('Service Worker not available');
  }

  // Récupérer la clé publique VAPID
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error('VAPID public key not found in environment variables');
  }

  // Créer ou récupérer la subscription
  try {
    // Vérifier si une subscription existe déjà
    let subscription = await registration.pushManager.getSubscription();

    // Si pas de subscription, en créer une nouvelle
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Convertir en format JSON
    const subscriptionJSON = subscription.toJSON();

    return {
      endpoint: subscriptionJSON.endpoint!,
      keys: {
        p256dh: subscriptionJSON.keys!.p256dh!,
        auth: subscriptionJSON.keys!.auth!,
      },
    };
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

/**
 * Se désabonne des notifications push
 */
export async function unsubscribeFromPushNotifications(): Promise<void> {
  if (!areNotificationsSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}

// ============================================================================
// Utilitaires
// ============================================================================

/**
 * Convertit une clé VAPID base64 en Uint8Array pour le navigateur
 * Nécessaire pour applicationServerKey dans PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
