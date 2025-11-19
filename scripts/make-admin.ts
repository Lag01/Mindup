import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  const email = 'erwanguezingar01@gmail.com';

  try {
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`❌ Utilisateur avec l'email ${email} non trouvé.`);
      console.log('Veuillez d\'abord créer un compte avec cet email.');
      process.exit(1);
    }

    // Mettre à jour l'utilisateur pour le passer en admin
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { isAdmin: true }
    });

    console.log(`✅ L'utilisateur ${email} est maintenant administrateur !`);
    console.log(`ID: ${updatedUser.id}`);
    console.log(`Créé le: ${updatedUser.createdAt}`);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
