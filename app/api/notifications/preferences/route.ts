import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserWithAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserWithAdmin();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer ou créer les préférences
    const settings = await prisma.notificationSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        webPushEnabled: false,
        dailyReminder: false,
        dailyReminderTime: '19:00',
        streakAlerts: true,
        motivationAlerts: true,
      },
      update: {},
      select: {
        webPushEnabled: true,
        dailyReminder: true,
        dailyReminderTime: true,
        streakAlerts: true,
        motivationAlerts: true,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des préférences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserWithAdmin();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer les données à mettre à jour
    const body = await request.json();
    const { dailyReminder, dailyReminderTime, streakAlerts, motivationAlerts } = body;

    // Valider le format de l'heure si fourni
    if (dailyReminderTime !== undefined) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(dailyReminderTime)) {
        return NextResponse.json(
          { error: 'Format d\'heure invalide. Utilisez HH:MM (ex: 19:00)' },
          { status: 400 }
        );
      }
    }

    // Préparer les données à mettre à jour
    const updateData: any = {};
    if (dailyReminder !== undefined) updateData.dailyReminder = dailyReminder;
    if (dailyReminderTime !== undefined) updateData.dailyReminderTime = dailyReminderTime;
    if (streakAlerts !== undefined) updateData.streakAlerts = streakAlerts;
    if (motivationAlerts !== undefined) updateData.motivationAlerts = motivationAlerts;

    // Mettre à jour les préférences
    const settings = await prisma.notificationSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        webPushEnabled: false,
        ...updateData,
      },
      update: updateData,
      select: {
        webPushEnabled: true,
        dailyReminder: true,
        dailyReminderTime: true,
        streakAlerts: true,
        motivationAlerts: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des préférences' },
      { status: 500 }
    );
  }
}
