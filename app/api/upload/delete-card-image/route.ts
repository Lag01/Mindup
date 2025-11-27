import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'cards');

export async function DELETE(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer le chemin de l'image
    const body = await request.json();
    const { imagePath } = body;

    if (!imagePath || !imagePath.startsWith('/uploads/cards/')) {
      return NextResponse.json(
        { error: 'Chemin d\'image invalide' },
        { status: 400 }
      );
    }

    // Extraire le nom du fichier
    const filename = imagePath.split('/').pop();
    if (!filename) {
      return NextResponse.json(
        { error: 'Nom de fichier invalide' },
        { status: 400 }
      );
    }

    // Construire le chemin complet
    const filepath = join(UPLOAD_DIR, filename);

    // Supprimer le fichier s'il existe
    if (existsSync(filepath)) {
      await unlink(filepath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du fichier' },
      { status: 500 }
    );
  }
}
