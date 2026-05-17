import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { analyzeAPKG, type APKGDeckSummary } from '@/lib/parsers/apkg';

const MAX_APKG_SIZE = 4 * 1024 * 1024;

/**
 * Pré-analyse un fichier d'import : pour les .apkg multi-decks, retourne la
 * liste des decks détectés pour permettre à l'UI de proposer une sélection à
 * l'utilisateur. Pour les autres formats (.csv, .xml) ou un .apkg mono-deck,
 * un seul deck est renvoyé et l'UI enchaîne directement sur l'import.
 *
 * Aucun side-effect : rien n'est écrit en base ; le client conserve le `File`
 * original et le ré-uploade vers `/api/import` à l'étape de confirmation.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fallbackName = file.name.replace(/\.[^.]+$/, '') || 'Deck importé';

    if (fileExtension === 'apkg') {
      if (file.size > MAX_APKG_SIZE) {
        return NextResponse.json(
          {
            error: `Fichier .apkg trop volumineux (max ${MAX_APKG_SIZE / (1024 * 1024)} Mo).`,
          },
          { status: 400 }
        );
      }
      let decks: APKGDeckSummary[];
      try {
        decks = await analyzeAPKG(await file.arrayBuffer());
      } catch (error: any) {
        return NextResponse.json(
          { error: `Erreur d'analyse : ${error.message}` },
          { status: 400 }
        );
      }

      if (decks.length === 0) {
        return NextResponse.json(
          { error: 'Aucune carte importable trouvée dans le deck Anki.' },
          { status: 400 }
        );
      }

      const totalCards = decks.reduce((sum, d) => sum + d.cardCount, 0);
      return NextResponse.json({
        format: 'apkg',
        decks,
        totalCards,
        fallbackName,
      });
    }

    if (fileExtension === 'csv' || fileExtension === 'xml') {
      // Mono-deck par construction : on renvoie une entrée nominale pour que le
      // client utilise le même flow sans logique conditionnelle côté UI.
      return NextResponse.json({
        format: fileExtension,
        decks: [{ ankiId: 0, name: fallbackName, cardCount: 0 }],
        totalCards: 0,
        fallbackName,
      });
    }

    return NextResponse.json(
      { error: 'Format de fichier non supporté. Utilisez .apkg, .xml ou .csv' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Analyze error:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
