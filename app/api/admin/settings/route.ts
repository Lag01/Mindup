import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAppSettings, updateAppSettings } from '@/lib/settings';

export async function GET() {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin();

    // Récupérer les paramètres
    const settings = await getAppSettings();

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof Error && error.message.includes('admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin();

    // Récupérer les données de la requête
    const body = await request.json();
    const { maxDecksPerUser, maxTotalUsers } = body;

    // Validation
    if (maxDecksPerUser !== undefined && (typeof maxDecksPerUser !== 'number' || maxDecksPerUser < 1)) {
      return NextResponse.json(
        { error: 'Le nombre maximum de decks doit être un nombre positif' },
        { status: 400 }
      );
    }

    if (maxTotalUsers !== undefined && (typeof maxTotalUsers !== 'number' || maxTotalUsers < 1)) {
      return NextResponse.json(
        { error: 'Le nombre maximum d\'utilisateurs doit être un nombre positif' },
        { status: 400 }
      );
    }

    // Mettre à jour les paramètres
    const settings = await updateAppSettings({
      maxDecksPerUser,
      maxTotalUsers,
    });

    return NextResponse.json({
      message: 'Paramètres mis à jour avec succès',
      settings,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    );
  }
}
