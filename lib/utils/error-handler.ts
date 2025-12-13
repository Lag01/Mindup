import { Prisma } from '@prisma/client';

export function handlePrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return 'Conflit : ces données existent déjà';
      case 'P2003':
        return 'Référence invalide dans la base de données';
      case 'P2025':
        return 'Enregistrement non trouvé';
      case 'P2014':
        return 'Violation de contrainte relationnelle';
      case 'P2021':
        return 'La table n\'existe pas';
      case 'P2022':
        return 'La colonne n\'existe pas';
      default:
        // Ne pas exposer les détails de l'erreur Prisma
        console.error('Prisma error:', error);
        return 'Une erreur de base de données s\'est produite';
    }
  }

  // Erreur inconnue
  console.error('Unknown error:', error);
  return 'Une erreur inattendue s\'est produite';
}
