import webpush from 'web-push';
import type { PushNotificationPayload, PushSubscriptionJSON } from './notifications.types';

// ============================================================================
// Côté Serveur - Configuration et Envoi
// ============================================================================

let isWebPushConfigured = false;

/**
 * Configure web-push avec les clés VAPID depuis les variables d'environnement
 * Doit être appelé côté serveur avant d'envoyer des notifications
 */
export function configureWebPush(): void {
  if (isWebPushConfigured) return;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
    throw new Error(
      'Missing VAPID environment variables. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL'
    );
  }

  webpush.setVapidDetails(
    vapidEmail,
    vapidPublicKey,
    vapidPrivateKey
  );

  isWebPushConfigured = true;
}

/**
 * Envoie une notification push à un utilisateur
 * @param subscription - La subscription push de l'utilisateur (JSON stringifié ou objet)
 * @param payload - Le contenu de la notification
 * @returns true si envoyé avec succès, false si la subscription est expirée (410)
 */
export async function sendPushNotification(
  subscription: string | PushSubscriptionJSON,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    // Configurer web-push si pas déjà fait
    if (!isWebPushConfigured) {
      configureWebPush();
    }

    // Parser la subscription si elle est en string
    const parsedSubscription: PushSubscriptionJSON =
      typeof subscription === 'string'
        ? JSON.parse(subscription)
        : subscription;

    // Valider le format de la subscription
    if (!parsedSubscription.endpoint || !parsedSubscription.keys?.p256dh || !parsedSubscription.keys?.auth) {
      console.error('Invalid push subscription format', parsedSubscription);
      return false;
    }

    // Préparer le payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'mindup-notification',
      url: payload.url || '/',
    });

    // Envoyer la notification
    await webpush.sendNotification(parsedSubscription, notificationPayload);

    return true;
  } catch (error: any) {
    // 410 = Gone (subscription expirée ou révoquée)
    if (error.statusCode === 410) {
      console.log('Push subscription expired or revoked (410)');
      return false;
    }

    // 404 = Not Found (subscription invalide)
    if (error.statusCode === 404) {
      console.log('Push subscription not found (404)');
      return false;
    }

    // Autres erreurs
    console.error('Error sending push notification:', error);
    throw error;
  }
}
