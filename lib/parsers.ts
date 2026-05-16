import { XMLParser } from 'fast-xml-parser';
import Papa from 'papaparse';
import type { AnkiReviewStats } from './anki';

export interface ParsedCard {
  front: string;
  back: string;
  frontType: 'TEXT' | 'LATEX';
  backType: 'TEXT' | 'LATEX';
  // Présent uniquement pour l'import APKG avec preserveHistory : stats FSRS converties depuis Anki.
  stats?: AnkiReviewStats;
}

export interface ParsedDeck {
  name: string;
  cards: ParsedCard[];
}

/**
 * Détecte automatiquement si le contenu est du LaTeX
 */
export function detectContentType(content: string): 'TEXT' | 'LATEX' {
  if (!content) return 'TEXT';

  // Indicateurs de LaTeX (formats standard + formats Anki)
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
    '[$]',          // LaTeX inline Anki : [$]formule[/$]
    '[$$]',         // LaTeX display Anki : [$$]formule[/$$]
    '[latex]',      // LaTeX bloc Anki : [latex]...[/latex]
    '\\(',          // LaTeX inline MathJax : \(...\)
    '\\[',          // LaTeX display MathJax : \[...\]
  ];

  return latexIndicators.some(indicator => content.includes(indicator))
    ? 'LATEX'
    : 'TEXT';
}

/**
 * Nettoie le HTML produit par Anki : décode les entités, transforme les balises de
 * structure basiques en sauts de ligne, supprime les médias (v1 ignore les images/audio),
 * et convertit les délimiteurs LaTeX Anki vers le format projet ($...$).
 *
 * Cette fonction est volontairement défensive : elle ne tente pas de préserver le
 * formatage avancé (gras/italique/listes) — voir le plan v2 pour le support HTML natif.
 */
export function cleanAnkiHtml(html: string): string {
  if (!html) return '';

  let text = html;

  // 1. Supprimer les médias (Anki encode images et audio dans le HTML)
  text = text.replace(/<img\b[^>]*>/gi, '');
  text = text.replace(/\[sound:[^\]]*\]/gi, '');

  // 2. Convertir les délimiteurs LaTeX Anki vers $...$
  //    [$]...[/$] : math inline
  //    [$$]...[/$$] : math display
  //    [latex]...[/latex] : bloc latex
  //    \(...\) et \[...\] : MathJax (laissés tels quels, ts-katex les supporte via $)
  text = text.replace(/\[\$\]([\s\S]*?)\[\/\$\]/g, '$$$1$$');
  text = text.replace(/\[\$\$\]([\s\S]*?)\[\/\$\$\]/g, '$$$1$$');
  text = text.replace(/\[latex\]([\s\S]*?)\[\/latex\]/gi, '$$$1$$');

  // 3. Transformer les balises de structure en sauts de ligne
  text = text.replace(/<br\s*\/?\s*>/gi, '\n');
  text = text.replace(/<\/(div|p|li|tr)>/gi, '\n');

  // 4. Strip toutes les autres balises HTML
  text = text.replace(/<[^>]+>/g, '');

  // 5. Décoder les entités HTML les plus courantes
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&hellip;': '…',
    '&mdash;': '—',
    '&ndash;': '–',
    '&laquo;': '«',
    '&raquo;': '»',
    '&rsquo;': '’',
    '&lsquo;': '‘',
  };
  text = text.replace(/&[a-z]+;|&#\d+;/gi, (match) => {
    if (entities[match]) return entities[match];
    // Décoder &#NN; (entité numérique)
    const m = match.match(/^&#(\d+);$/);
    if (m) {
      const code = Number(m[1]);
      if (code > 0 && code < 0x110000) return String.fromCodePoint(code);
    }
    return match;
  });

  // 6. Normaliser les espaces : trim et collapse des espaces consécutifs
  //    (mais on préserve les \n simples comme séparateurs de paragraphes)
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]*\n[ \t]*/g, '\n');

  return text.trim();
}

export function parseXML(content: string): ParsedDeck {
  if (content.length > 5 * 1024 * 1024) {
    throw new Error('Fichier XML trop volumineux (max 5 Mo)');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    processEntities: false,
  });

  const result = parser.parse(content);

  if (!result.deck) {
    throw new Error('Format XML invalide : balise <deck> manquante');
  }

  const deck = result.deck;
  const deckName = deck['@_name'] || 'Deck sans nom';

  // Extraire manuellement toutes les balises <card> avec regex
  // pour contourner le bug de fast-xml-parser qui ne groupe pas
  // les éléments avec des structures différentes (ordre des enfants)
  const cardMatches = content.match(/<card>.*?<\/card>/g);

  if (!cardMatches || cardMatches.length === 0) {
    throw new Error('Format XML invalide : aucune carte trouvée');
  }

  // Parser chaque carte individuellement
  const cardsArray = cardMatches.map((cardXml) => {
    const cardResult = parser.parse(cardXml);
    return cardResult.card;
  });

  const cards: ParsedCard[] = cardsArray.map((card: any, index: number) => {
    let front = '';
    let back = '';

    // Normaliser card.tex en tableau (qu'il soit déjà array ou objet unique)
    if (card.tex) {
      const texArray = Array.isArray(card.tex) ? card.tex : [card.tex];

      texArray.forEach((tex: any) => {
        const name = tex['@_name'];

        // Gérer différents formats de contenu retournés par fast-xml-parser
        let content = '';
        if (typeof tex === 'string') {
          content = tex.trim();
        } else if (tex['#text'] !== undefined && tex['#text'] !== null) {
          content = String(tex['#text']).trim();
        } else if (tex) {
          // Fallback: chercher une valeur directe ou convertir
          const val = tex.valueOf ? tex.valueOf() : tex;
          content = String(val).trim();
        }

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
