import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { XMLBuilder } from 'fast-xml-parser';
import Papa from 'papaparse';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id: deckId } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    if (!format || !['xml', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Format invalide. Utilisez ?format=xml ou ?format=csv' },
        { status: 400 }
      );
    }

    // Récupérer le deck avec toutes ses cartes
    const deck = await prisma.deck.findUnique({
      where: {
        id: deckId,
        userId: user.id, // Vérifier que le deck appartient bien à l'utilisateur
      },
      include: {
        cards: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      );
    }

    if (deck.cards.length === 0) {
      return NextResponse.json(
        { error: 'Ce deck ne contient aucune carte' },
        { status: 400 }
      );
    }

    let content: string;
    let filename: string;
    let contentType: string;

    if (format === 'xml') {
      // Générer le XML
      const xmlData = {
        deck: {
          '@_name': deck.name,
          cards: {
            card: deck.cards.map(card => ({
              tex: [
                {
                  '@_name': 'Front',
                  '#text': card.front,
                },
                {
                  '@_name': 'Back',
                  '#text': card.back,
                },
              ],
            })),
          },
        },
      };

      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        format: false,
        suppressEmptyNode: true,
      });

      let xmlContent = builder.build(xmlData);

      // Formater manuellement pour améliorer la lisibilité
      // tout en gardant chaque <card> sur une seule ligne (requis pour l'import)
      xmlContent = xmlContent
        .replace(/<deck /, '\n<deck ')
        .replace(/<cards>/, '<cards>\n    ')
        .replace(/<\/cards>/, '\n  </cards>')
        .replace(/<\/deck>/, '\n</deck>')
        .replace(/<card>/g, '<card>')
        .replace(/<\/card>/g, '</card>\n    ');

      // Nettoyer les espaces en trop à la fin
      xmlContent = xmlContent.trim() + '\n';

      content = xmlContent;
      filename = `${deck.name}.xml`;
      contentType = 'application/xml';
    } else {
      // Générer le CSV
      const csvData = deck.cards.map(card => ({
        Front: card.front,
        Back: card.back,
      }));

      content = Papa.unparse(csvData, {
        delimiter: ',',
        header: true,
        newline: '\r\n',
      });

      filename = `${deck.name}.csv`;
      contentType = 'text/csv';
    }

    // Retourner le fichier en téléchargement
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);

    return NextResponse.json(
      { error: 'Erreur lors de l\'export du deck' },
      { status: 500 }
    );
  }
}
