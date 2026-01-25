import { NextResponse } from 'next/server';
import { getCurrentUserWithAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserWithAdmin();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Désactiver les notifications et supprimer la subscription
    await prisma.notificationSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        webPushEnabled: false,
        pushSubscription: null,
      },
      update: {
        webPushEnabled: false,
        pushSubscription: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Désabonnement réussi',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du désabonnement' },
      { status: 500 }
    );
  }
}
