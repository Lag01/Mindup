import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier que l'utilisateur est admin
    const admin = await requireAdmin();
    const { id } = await params;

    // Empêcher la suppression de son propre compte
    if (admin.id === id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur à supprimer existe
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer l'utilisateur (cascade supprimera aussi ses decks, cartes et reviews)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Utilisateur supprimé avec succès',
      deletedUser: {
        id: userToDelete.id,
        email: userToDelete.email,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Non authentifié')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('admin') || error.message.includes('Accès refusé')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'utilisateur' },
      { status: 500 }
    );
  }
}
