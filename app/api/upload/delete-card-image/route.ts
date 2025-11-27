import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { requireAdmin } from '@/lib/auth';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'cards');

export async function DELETE(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    try {
      await requireAdmin();
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Accès refusé' },
        { status: 403 }
      );
    }

    // Récupérer le chemin de l'image
    const body = await request.json();
    const { imagePath } = body;

    if (!imagePath) {
      return NextResponse.json(
        { error: 'Chemin d\'image requis' },
        { status: 400 }
      );
    }

    // Vérifier si c'est une URL Vercel Blob ou un chemin local
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // URL Vercel Blob - utiliser la fonction del
      console.log('[Delete] Suppression depuis Vercel Blob:', imagePath);
      await del(imagePath);
      console.log('[Delete] Fichier supprimé avec succès de Vercel Blob');
    } else if (imagePath.startsWith('/uploads/cards/')) {
      // Chemin local - utiliser unlink (pour compatibilité avec les anciennes images)
      const filename = imagePath.split('/').pop();
      if (!filename) {
        return NextResponse.json(
          { error: 'Nom de fichier invalide' },
          { status: 400 }
        );
      }

      const filepath = join(UPLOAD_DIR, filename);
      if (existsSync(filepath)) {
        await unlink(filepath);
        console.log('[Delete] Fichier local supprimé:', filepath);
      }
    } else {
      return NextResponse.json(
        { error: 'Chemin d\'image invalide' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Delete] Erreur lors de la suppression:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du fichier' },
      { status: 500 }
    );
  }
}
