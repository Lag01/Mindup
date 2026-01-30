import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin();

    // Récupérer tous les utilisateurs avec leurs statistiques
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            decks: true,
            reviewEvents: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Formater les données pour l'affichage
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      decksCount: user._count.decks,
      reviewsCount: user._count.reviewEvents,
      reviewedCardsCount: user._count.reviewEvents,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Non authentifié')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('admin') || error.message.includes('Accès refusé')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}
