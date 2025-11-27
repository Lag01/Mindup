import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireAdmin } from '@/lib/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
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

    // Récupérer le fichier depuis le formulaire
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Valider le type MIME
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Formats acceptés : PNG, JPG, GIF, WEBP' },
        { status: 400 }
      );
    }

    // Valider la taille
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (maximum 5MB)' },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `cards/${timestamp}_${randomId}.${extension}`;

    console.log('[Upload] Upload vers Vercel Blob:', filename);

    // Upload vers Vercel Blob Storage
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log('[Upload] Fichier uploadé avec succès:', blob.url);

    // Retourner l'URL publique du blob
    return NextResponse.json({
      success: true,
      path: blob.url,
      filename: filename,
      url: blob.url,
    });
  } catch (error) {
    console.error('[Upload] Erreur lors de l\'upload:', error);
    console.error('[Upload] Type d\'erreur:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[Upload] Message:', error instanceof Error ? error.message : String(error));
    console.error('[Upload] Stack:', error instanceof Error ? error.stack : 'N/A');

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: 'Erreur lors de l\'upload du fichier',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
