import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { displayName } = body;

    // Validation
    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json(
        { error: 'Pseudo invalide' },
        { status: 400 }
      );
    }

    if (displayName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le pseudo ne peut pas être vide' },
        { status: 400 }
      );
    }

    if (displayName.length > 50) {
      return NextResponse.json(
        { error: 'Le pseudo ne peut pas dépasser 50 caractères' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Mettre à jour le pseudo
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { displayName: displayName.trim() },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    return NextResponse.json({
      message: 'Pseudo mis à jour avec succès',
      user: updatedUser,
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
    console.error('Error updating display name:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du pseudo' },
      { status: 500 }
    );
  }
}
