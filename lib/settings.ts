import { prisma } from './prisma';

const DEFAULT_SETTINGS_ID = 'default';

export async function getAppSettings() {
  try {
    let settings = await prisma.appSettings.findUnique({
      where: { id: DEFAULT_SETTINGS_ID },
    });

    // Si les paramètres n'existent pas encore, les créer avec les valeurs par défaut
    if (!settings) {
      settings = await prisma.appSettings.create({
        data: {
          id: DEFAULT_SETTINGS_ID,
          maxDecksPerUser: 10,
          maxTotalUsers: 5,
        },
      });
    }

    return settings;
  } catch (error) {
    console.error('Error fetching app settings:', error);
    // Retourner les valeurs par défaut en cas d'erreur
    return {
      id: DEFAULT_SETTINGS_ID,
      maxDecksPerUser: 10,
      maxTotalUsers: 5,
      updatedAt: new Date(),
    };
  }
}

export async function updateAppSettings(data: {
  maxDecksPerUser?: number;
  maxTotalUsers?: number;
}) {
  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: DEFAULT_SETTINGS_ID },
      update: data,
      create: {
        id: DEFAULT_SETTINGS_ID,
        maxDecksPerUser: data.maxDecksPerUser ?? 10,
        maxTotalUsers: data.maxTotalUsers ?? 5,
      },
    });

    return settings;
  } catch (error) {
    console.error('Error updating app settings:', error);
    throw error;
  }
}
