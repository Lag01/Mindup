/**
 * Tâche CRON pour l'envoi automatique des notifications push
 * Exécutée toutes les heures
 *
 * Envoie des notifications aux utilisateurs selon leurs préférences :
 * - Alertes de streak en danger (prioritaire)
 * - Messages de motivation sans streak (prioritaire)
 * - Rappels quotidiens à heure fixe (opt-in)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyBearerToken } from '@/lib/security';
import { calculateStreakOptimized } from '@/lib/streak';
import { sendPushNotification, configureWebPush } from '@/lib/notifications.server';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification Vercel Cron
    const authHeader = request.headers.get('authorization');
    const isAuthorized = verifyBearerToken(authHeader, process.env.CRON_SECRET);

    if (!isAuthorized) {
      console.error('[CRON-NOTIF] Tentative d\'accès non autorisée');
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    console.log('[CRON-NOTIF] 🔔 Démarrage de l\'envoi des notifications quotidiennes...');

    // Configurer web-push
    configureWebPush();

    // Récupérer tous les utilisateurs avec notifications activées
    const usersWithNotifications = await prisma.notificationSettings.findMany({
      where: {
        webPushEnabled: true,
        pushSubscription: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            currentStreak: true,
            displayName: true,
          },
        },
      },
    });

    if (usersWithNotifications.length === 0) {
      console.log('[CRON-NOTIF] ✨ Aucun utilisateur avec notifications activées');
      return NextResponse.json({
        success: true,
        message: 'Aucun utilisateur avec notifications activées',
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    }

    console.log(`[CRON-NOTIF] 📝 ${usersWithNotifications.length} utilisateur(s) à traiter`);

    // Heure actuelle
    const currentHour = new Date().getHours();
    const currentMinutes = new Date().getMinutes();

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Traiter chaque utilisateur
    for (const settings of usersWithNotifications) {
      processed++;
      const userId = settings.userId;
      const user = settings.user;

      try {
        console.log(`[CRON-NOTIF] Traitement utilisateur ${user.displayName} (${userId})`);

        // Calculer le streak actuel
        const streakData = await calculateStreakOptimized(userId);
        const { currentStreak, includesCurrentDay } = streakData;

        console.log(`[CRON-NOTIF] Streak: ${currentStreak}, Inclut aujourd'hui: ${includesCurrentDay}`);

        let notificationToSend: { title: string; body: string; tag: string; url: string } | null = null;

        // Priorité 1 : Alerte de streak en danger
        if (
          settings.streakAlerts &&
          currentStreak > 0 &&
          !includesCurrentDay &&
          currentHour >= 18
        ) {
          notificationToSend = {
            title: '🔥 Streak en danger !',
            body: `Ton streak de ${currentStreak} jour${currentStreak > 1 ? 's' : ''} est en danger ! Révise aujourd'hui pour le maintenir.`,
            tag: 'streak-alert',
            url: '/dashboard',
          };
          console.log('[CRON-NOTIF] 🔥 Alerte de streak en danger');
        }
        // Priorité 2 : Message de motivation sans streak
        else if (
          settings.motivationAlerts &&
          currentStreak === 0 &&
          !includesCurrentDay &&
          currentHour >= 18 &&
          !notificationToSend
        ) {
          notificationToSend = {
            title: 'Motivation Mindup',
            body: 'Je croyais que tu voulais t\'améliorer ? 🤔',
            tag: 'motivation-alert',
            url: '/dashboard',
          };
          console.log('[CRON-NOTIF] 💪 Message de motivation');
        }
        // Priorité 3 : Rappel quotidien (opt-in)
        else if (
          settings.dailyReminder &&
          !includesCurrentDay &&
          !notificationToSend
        ) {
          // Parser l'heure du rappel (format "HH:MM")
          const [reminderHour, reminderMinute] = settings.dailyReminderTime.split(':').map(Number);

          // Vérifier si on est dans la plage horaire (tolérance de ±30 minutes)
          const hourMatch = currentHour === reminderHour;
          const minuteDiff = Math.abs(currentMinutes - reminderMinute);
          const isTimeToRemind = hourMatch && minuteDiff <= 30;

          if (isTimeToRemind) {
            notificationToSend = {
              title: '🎯 C\'est l\'heure de réviser !',
              body: 'Prêt à améliorer tes connaissances aujourd\'hui ?',
              tag: 'daily-reminder',
              url: '/dashboard',
            };
            console.log('[CRON-NOTIF] 🎯 Rappel quotidien');
          }
        }

        // Envoyer la notification si une a été déterminée
        if (notificationToSend) {
          const success = await sendPushNotification(
            settings.pushSubscription!,
            notificationToSend
          );

          if (success) {
            sent++;
            console.log(`[CRON-NOTIF] ✅ Notification envoyée à ${user.displayName}`);
          } else {
            // Subscription expirée (410 Gone) - désactiver automatiquement
            console.log(`[CRON-NOTIF] ⚠️  Subscription expirée pour ${user.displayName} - désactivation`);
            await prisma.notificationSettings.update({
              where: { userId },
              data: {
                webPushEnabled: false,
                pushSubscription: null,
              },
            });
            failed++;
          }
        } else {
          skipped++;
          console.log(`[CRON-NOTIF] ⏭️  Aucune notification à envoyer pour ${user.displayName}`);
        }

        // Petit délai entre les envois pour ne pas surcharger
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[CRON-NOTIF] Erreur lors du traitement de l'utilisateur ${userId}:`, error);
        failed++;
      }
    }

    const result = {
      success: true,
      processed,
      sent,
      failed,
      skipped,
      timestamp: new Date().toISOString(),
    };

    console.log('[CRON-NOTIF] ✨ Tâche d\'envoi des notifications terminée');
    console.log(`[CRON-NOTIF] Résumé: ${sent} envoyée(s), ${failed} échouée(s), ${skipped} ignorée(s)`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[CRON-NOTIF] ❌ Erreur critique lors de l\'envoi des notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de l\'envoi des notifications',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}
