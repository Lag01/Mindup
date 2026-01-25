import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserWithAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { PushSubscriptionJSON } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserWithAdmin();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer la subscription depuis le body
    const body = await request.json();
    const { subscription } = body as { subscription: PushSubscriptionJSON };

    // Valider le format de la subscription
    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: 'Format de subscription invalide' },
        { status: 400 }
      );
    }

    // Sauvegarder ou mettre à jour la subscription dans la DB
    await prisma.notificationSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        webPushEnabled: true,
        pushSubscription: JSON.stringify(subscription),
      },
      update: {
        webPushEnabled: true,
        pushSubscription: JSON.stringify(subscription),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Abonnement aux notifications réussi',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'abonnement aux notifications' },
      { status: 500 }
    );
  }
}
