/**
 * Tâche CRON pour l'envoi automatique des notifications push
 * Exécutée quotidiennement à 18h
 *
 * Envoie UNE notification par jour aux utilisateurs qui n'ont pas encore révisé :
 * - Si streak actif → message pour continuer le streak
 * - Si pas de streak → message de motivation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyBearerToken } from '@/lib/security';
import { calculateStreakOptimized } from '@/lib/streak';
import { sendPushNotification, configureWebPush } from '@/lib/notifications.server';
import { getRandomMotivationMessage } from '@/lib/motivation-messages';

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

    console.log('[CRON-NOTIF] 🔔 Démarrage de l\'envoi des notifications quotidiennes (18h)...');

    // Configurer web-push
    configureWebPush();

    // Récupérer tous les utilisateurs avec notifications activées
    const usersWithNotifications = await prisma.notificationSettings.findMany({
      where: {
        webPushEnabled: true,
        pushSubscription: {
          not: null,
        },
        OR: [
          { streakAlerts: true },
          { motivationAlerts: true },
        ],
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

        // Si l'utilisateur a déjà révisé aujourd'hui, on ne fait rien
        if (includesCurrentDay) {
          skipped++;
          console.log(`[CRON-NOTIF] ⏭️  ${user.displayName} a déjà révisé aujourd'hui, pas de notification`);
          continue;
        }

        let notificationToSend: { title: string; body: string; tag: string; url: string } | null = null;

        // Cas 1 : Utilisateur avec un streak actif
        if (currentStreak > 0 && settings.streakAlerts) {
          const motivationMessage = getRandomMotivationMessage(true, currentStreak);

          notificationToSend = {
            title: '🔥 Streak en danger !',
            body: motivationMessage,
            tag: 'daily-motivation',
            url: '/dashboard',
          };
          console.log('[CRON-NOTIF] 🔥 Notification de streak');
        }
        // Cas 2 : Utilisateur sans streak actif
        else if (currentStreak === 0 && settings.motivationAlerts) {
          const motivationMessage = getRandomMotivationMessage(false);

          notificationToSend = {
            title: '💪 Motivation du jour',
            body: motivationMessage,
            tag: 'daily-motivation',
            url: '/dashboard',
          };
          console.log('[CRON-NOTIF] 💪 Notification de motivation');
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
