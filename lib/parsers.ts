import { XMLParser } from 'fast-xml-parser';
import Papa from 'papaparse';

export interface ParsedCard {
  front: string;
  back: string;
  frontType: 'TEXT' | 'LATEX';
  backType: 'TEXT' | 'LATEX';
}

export interface ParsedDeck {
  name: string;
  cards: ParsedCard[];
}

/**
 * Détecte automatiquement si le contenu est du LaTeX
 */
function detectContentType(content: string): 'TEXT' | 'LATEX' {
  if (!content) return 'TEXT';

  // Indicateurs de LaTeX
  const latexIndicators = [
    '\\',           // Backslash (commandes LaTeX)
    '$',            // Délimiteurs de math inline
    '\\frac',       // Fraction
    '\\sum',        // Somme
    '\\int',        // Intégrale
    '\\sqrt',       // Racine carrée
    '\\begin',      // Environnement
    '\\end',        // Fin d'environnement
    '^{',           // Exposant
    '_{',           // Indice
    '\\left',       // Délimiteur gauche
    '\\right',      // Délimiteur droit
  ];

  return latexIndicators.some(indicator => content.includes(indicator))
    ? 'LATEX'
    : 'TEXT';
}

export function parseXML(content: string): ParsedDeck {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const result = parser.parse(content);

  if (!result.deck) {
    throw new Error('Format XML invalide : balise <deck> manquante');
  }

  const deck = result.deck;
  const deckName = deck['@_name'] || 'Deck sans nom';

  if (!deck.cards || !deck.cards.card) {
    throw new Error('Format XML invalide : aucune carte trouvée');
  }

  const cardsArray = Array.isArray(deck.cards.card)
    ? deck.cards.card
    : [deck.cards.card];

  const cards: ParsedCard[] = cardsArray.map((card: any, index: number) => {
    let front = '';
    let back = '';

    // Normaliser card.tex en tableau (qu'il soit déjà array ou objet unique)
    if (card.tex) {
      const texArray = Array.isArray(card.tex) ? card.tex : [card.tex];

      texArray.forEach((tex: any) => {
        const name = tex['@_name'];
        const content = (tex['#text'] || '').trim();
        if (name === 'Front') {
          front = content;
        } else if (name === 'Back') {
          back = content;
        }
      });
    }

    if (!front && !back) {
      throw new Error(`Carte ${index + 1} : front et back manquants`);
    }

    return {
      front,
      back,
      frontType: detectContentType(front),
      backType: detectContentType(back),
    };
  });

  if (cards.length === 0) {
    throw new Error('Aucune carte valide trouvée dans le fichier');
  }

  return {
    name: deckName,
    cards,
  };
}

export function parseCSV(content: string): Promise<ParsedDeck> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            throw new Error('Aucune donnée trouvée dans le fichier CSV');
          }

          // Récupérer les noms des colonnes
          const fields = results.meta?.fields || [];

          if (fields.length < 2) {
            throw new Error('Le fichier CSV doit contenir au moins 2 colonnes');
          }

          const cards: ParsedCard[] = [];

          results.data.forEach((row: any, index: number) => {
            // Essayer d'abord les noms de colonnes standards
            let front = (row.Front || row.front || row.Question || row.question || '').trim();
            let back = (row.Back || row.back || row.Answer || row.answer || '').trim();

            // Si aucun nom standard trouvé, utiliser les 2 premières colonnes
            if (!front && !back && fields.length >= 2) {
              front = (row[fields[0]] || '').trim();
              back = (row[fields[1]] || '').trim();
            }

            // Validation stricte : front ET back requis
            if (front && back) {
              cards.push({
                front,
                back,
                frontType: detectContentType(front),
                backType: detectContentType(back),
              });
            } else if (front || back) {
              console.warn(`Ligne ${index + 2} ignorée : front ou back manquant`);
            }
          });

          if (cards.length === 0) {
            throw new Error('Aucune carte valide trouvée dans le fichier CSV');
          }

          resolve({
            name: 'Deck importé (CSV)',
            cards,
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(new Error(`Erreur lors du parsing CSV : ${error.message}`));
      },
    });
  });
}
