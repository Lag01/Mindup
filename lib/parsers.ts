import { XMLParser } from 'fast-xml-parser';
import Papa from 'papaparse';

export interface ParsedCard {
  front: string;
  back: string;
}

export interface ParsedDeck {
  name: string;
  cards: ParsedCard[];
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

    if (Array.isArray(card.tex)) {
      card.tex.forEach((tex: any) => {
        const name = tex['@_name'];
        const content = tex['#text'] || '';
        if (name === 'Front') {
          front = content;
        } else if (name === 'Back') {
          back = content;
        }
      });
    } else if (card.tex) {
      const tex = card.tex;
      const name = tex['@_name'];
      const content = tex['#text'] || '';
      if (name === 'Front') {
        front = content;
      } else if (name === 'Back') {
        back = content;
      }
    }

    if (!front && !back) {
      throw new Error(`Carte ${index + 1} : front et back manquants`);
    }

    return { front, back };
  });

  if (cards.length === 0) {
    throw new Error('Aucune carte valide trouvée dans le fichier');
  }

  return {
    name: deckName,
    cards,
  };
}

export function parseCSV(content: string): ParsedDeck {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            throw new Error('Aucune donnée trouvée dans le fichier CSV');
          }

          const cards: ParsedCard[] = [];

          results.data.forEach((row: any, index: number) => {
            const front = row.Front || row.front || row.Question || row.question || '';
            const back = row.Back || row.back || row.Answer || row.answer || '';

            if (front || back) {
              cards.push({ front, back });
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
      error: (error) => {
        reject(new Error(`Erreur lors du parsing CSV : ${error.message}`));
      },
    });
  });
}
