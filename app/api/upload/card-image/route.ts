import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { getCurrentUser } from '@/lib/auth';

const UPLOAD_DIR = resolve(process.cwd(), 'public', 'uploads', 'cards');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
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

    // Créer le dossier s'il n'existe pas
    try {
      console.log('[Upload] Vérification du dossier:', UPLOAD_DIR);
      console.log('[Upload] process.cwd():', process.cwd());

      if (!existsSync(UPLOAD_DIR)) {
        console.log('[Upload] Création du dossier:', UPLOAD_DIR);
        await mkdir(UPLOAD_DIR, { recursive: true, mode: 0o777 });
        console.log('[Upload] Dossier créé avec succès');
      } else {
        console.log('[Upload] Dossier existant:', UPLOAD_DIR);
      }

      // Vérifier les permissions d'écriture
      const testFile = join(UPLOAD_DIR, '.write-test');
      try {
        await writeFile(testFile, 'test');
        await import('fs/promises').then(fs => fs.unlink(testFile));
        console.log('[Upload] Permissions d\'écriture vérifiées');
      } catch (permError) {
        console.error('[Upload] Pas de permission d\'écriture dans:', UPLOAD_DIR);
        throw new Error('Pas de permission d\'écriture dans le dossier de destination');
      }
    } catch (mkdirError) {
      console.error('[Upload] Erreur lors de la création du dossier:', mkdirError);
      const errorMsg = mkdirError instanceof Error ? mkdirError.message : 'Erreur inconnue';
      return NextResponse.json(
        {
          error: 'Impossible de créer le dossier de destination',
          details: process.env.NODE_ENV === 'development' ? errorMsg : undefined
        },
        { status: 500 }
      );
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${timestamp}_${randomId}.${extension}`;
    const filepath = resolve(UPLOAD_DIR, filename);

    console.log('[Upload] Tentative de sauvegarde:', filepath);

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    console.log('[Upload] Fichier sauvegardé avec succès:', filename);

    // Retourner le chemin relatif
    return NextResponse.json({
      success: true,
      path: `/uploads/cards/${filename}`,
      filename: filename,
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
