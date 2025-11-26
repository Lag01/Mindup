import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Vérification des paramètres de l\'application...');

  // Vérifier si AppSettings existe
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' }
  });

  if (!settings) {
    console.log('Création des paramètres par défaut...');
    await prisma.appSettings.create({
      data: {
        id: 'default',
        maxDecksPerUser: 10,
        maxTotalUsers: 5,
      }
    });
    console.log('✓ Paramètres créés avec succès');
  } else {
    console.log('✓ Les paramètres existent déjà:', settings);
  }

  // Vérifier les utilisateurs admin
  const adminUsers = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { id: true, email: true, isAdmin: true }
  });

  console.log(`\n✓ Nombre d'administrateurs: ${adminUsers.length}`);
  if (adminUsers.length > 0) {
    console.log('Administrateurs:', adminUsers);
  }
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
