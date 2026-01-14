import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireAdmin } from '@/lib/auth';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB (limite Vercel Blob)
// Note : SVG est explicitement exclu pour des raisons de sécurité (risque XSS)
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

// Magic bytes pour vérifier la signature réelle du fichier
const MAGIC_BYTES = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46], // "RIFF" + WebP signature à offset 8
};

function validateImageMagicBytes(buffer: Buffer): boolean {
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true;
  }
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return true;
  }
  // WebP (RIFF header + WebP signature)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    // Vérifier "WEBP" à l'offset 8
    if (buffer.length >= 12 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 &&
        buffer[10] === 0x42 && buffer[11] === 0x50) {
      return true;
    }
  }
  return false;
}

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
        { error: 'Fichier trop volumineux (maximum 4.5MB)' },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique avec UUID pour éviter les collisions
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `cards/${timestamp}_${uuid}.${extension}`;

    console.log('[Upload] Upload vers Vercel Blob:', filename);

    // Convertir le fichier en buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validation des magic bytes (signature réelle du fichier)
    if (!validateImageMagicBytes(buffer)) {
      return NextResponse.json(
        { error: 'Fichier invalide ou corrompu. Le fichier ne correspond pas à un format d\'image supporté.' },
        { status: 400 }
      );
    }

    // Compression avec Sharp
    const compressedBuffer = await sharp(buffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    console.log('[Upload] Compression terminée, taille:', compressedBuffer.length, 'bytes');

    // Upload vers Vercel Blob Storage
    const blob = await put(filename, compressedBuffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'image/jpeg',
    });

    console.log('[Upload] Fichier uploadé avec succès:', blob.url);

    // Retourner l'URL propre sans cache busting pour stockage cohérent en BD
    // Le cache busting sera appliqué dynamiquement lors de l'affichage
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
