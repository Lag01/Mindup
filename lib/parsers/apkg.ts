/**
 * Parser pour les fichiers .apkg (Anki Package).
 *
 * Format .apkg :
 * - ZIP contenant :
 *   - `meta` : protobuf de version
 *   - `collection.anki21b` : SQLite compressé en Zstandard (Anki ≥ 2.1.50, données réelles)
 *   - `collection.anki2` : SQLite non compressé (rétro-compatibilité, souvent vide en moderne)
 *   - `media` : JSON {numéro → nom de fichier} compressé zstd (ignoré v1)
 *   - fichiers médias numérotés 0, 1, 2... (ignorés v1)
 *
 * Cette v1 ignore les médias (images/audio) et le formatage HTML avancé.
 */

import JSZip from 'jszip';
import * as fzstd from 'fzstd';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import path from 'node:path';

import type { ParsedDeck, ParsedCard } from '../parsers';
import { detectContentType, cleanAnkiHtml } from '../parsers';
import { convertAnkiCardToReviewStats, type AnkiCardRow, type AnkiRevlogRow } from '../anki-import';

const ANKI_FIELD_SEPARATOR = '\x1f';

/**
 * Charge le module sql.js. On lit le WASM depuis node_modules à la demande
 * (Vercel serverless le préserve grâce à outputFileTracingIncludes dans next.config).
 */
let sqlJsPromise: Promise<SqlJsStatic> | null = null;
async function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: (file: string) => {
        // En environnement Node.js, on retourne un chemin filesystem ;
        // sql.js détecte que ce n'est pas une URL et utilise fs.
        return path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file);
      },
    });
  }
  return sqlJsPromise;
}

/**
 * Décompresse un buffer zstd. fzstd attend un Uint8Array et renvoie un Uint8Array.
 */
function decompressZstd(data: Uint8Array): Uint8Array {
  return fzstd.decompress(data);
}

/**
 * Récupère le buffer SQLite à utiliser depuis l'archive ZIP.
 * Priorité : collection.anki21b (zstd) > collection.anki21 (SQLite brut) > collection.anki2.
 */
async function extractSqliteBuffer(zip: JSZip): Promise<Uint8Array> {
  const candidates: Array<{ name: string; zstd: boolean }> = [
    { name: 'collection.anki21b', zstd: true },
    { name: 'collection.anki21', zstd: false },
    { name: 'collection.anki2', zstd: false },
  ];

  for (const { name, zstd } of candidates) {
    const entry = zip.file(name);
    if (!entry) continue;
    const raw = await entry.async('uint8array');
    if (zstd) {
      try {
        return decompressZstd(raw);
      } catch (err) {
        throw new Error(
          `Impossible de décompresser ${name} (zstd) : ${(err as Error).message}`
        );
      }
    }
    return raw;
  }
  throw new Error(
    'Aucune base de données Anki trouvée dans le fichier (.anki21b, .anki21 ou .anki2 attendu).'
  );
}

/**
 * Exécute une requête et renvoie une liste de lignes typées.
 */
function queryAll<T>(db: Database, sql: string): T[] {
  const stmt = db.prepare(sql);
  const rows: T[] = [];
  try {
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
  } finally {
    stmt.free();
  }
  return rows;
}

/**
 * Lit le contenu d'un champ Anki en gérant le mapping ord → indice.
 * Si ord dépasse la taille de flds, on retombe sur le premier champ.
 */
function fieldAt(flds: string[], index: number): string {
  if (index < 0 || index >= flds.length) {
    return flds[0] ?? '';
  }
  return flds[index];
}

/**
 * Choisit la meilleure paire (front, back) pour une carte donnée, en fonction de l'ord
 * du template Anki. Approche pragmatique v1 :
 *   - ord = 0  → front = flds[0], back = flds[1]
 *   - ord = 1  → carte inversée (Basic + Reverse) : front = flds[1], back = flds[0]
 *   - ord >= 2 → notetype complexe (cloze, image occlusion) : fallback flds[0]/[1]
 */
function pickFrontBack(flds: string[], ord: number): { front: string; back: string } {
  if (flds.length < 2) {
    return { front: flds[0] ?? '', back: '' };
  }
  if (ord === 1) {
    return { front: fieldAt(flds, 1), back: fieldAt(flds, 0) };
  }
  return { front: fieldAt(flds, 0), back: fieldAt(flds, 1) };
}

/** Représentation d'un deck Anki détecté dans un .apkg, exposée à l'UI. */
export interface APKGDeckSummary {
  /** Identifiant Anki du deck (table `decks`). */
  ankiId: number;
  /** Nom aplati (sous-decks séparés par " :: "). */
  name: string;
  /** Nombre de cartes importables (queue >= 0) appartenant à ce deck. */
  cardCount: number;
}

function flattenDeckName(rawName: string): string {
  return rawName.split(ANKI_FIELD_SEPARATOR).join(' :: ');
}

/**
 * Liste les decks contenant au moins une carte importable. Couvre les deux schémas
 * Anki :
 *   - Moderne (anki21b/anki21) : table `decks`.
 *   - Legacy (anki2) : col.decks au format JSON.
 */
export function listAPKGDecks(db: Database): APKGDeckSummary[] {
  // 1. Schéma moderne : table decks dédiée.
  try {
    const rows = queryAll<{ id: number; name: string; cardCount: number }>(
      db,
      `SELECT d.id AS id, d.name AS name, COUNT(c.id) AS cardCount
         FROM decks d
         INNER JOIN cards c ON c.did = d.id
         WHERE c.queue >= 0
         GROUP BY d.id
         HAVING cardCount > 0
         ORDER BY cardCount DESC`
    );
    if (rows.length > 0) {
      return rows
        .filter((r) => !!r.name)
        .map((r) => ({
          ankiId: r.id,
          name: flattenDeckName(r.name),
          cardCount: Number(r.cardCount) || 0,
        }));
    }
  } catch {
    // Tombe sur le schéma legacy ci-dessous.
  }

  // 2. Schéma legacy : col.decks (JSON) + comptage manuel via cards.did.
  try {
    const col = queryAll<{ decks: string }>(db, `SELECT decks FROM col LIMIT 1`);
    if (col.length > 0 && col[0].decks) {
      const decks = JSON.parse(col[0].decks) as Record<string, { id?: number; name: string }>;
      const counts = queryAll<{ did: number; cardCount: number }>(
        db,
        `SELECT did, COUNT(id) AS cardCount FROM cards WHERE queue >= 0 GROUP BY did`
      );
      const countById = new Map<number, number>();
      for (const c of counts) countById.set(c.did, Number(c.cardCount) || 0);

      return Object.entries(decks)
        .map(([key, value]) => {
          const id = value.id ?? Number(key);
          const cardCount = countById.get(id) ?? 0;
          return { ankiId: id, name: flattenDeckName(value.name), cardCount };
        })
        .filter((d) => d.cardCount > 0)
        .sort((a, b) => b.cardCount - a.cardCount);
    }
  } catch {
    // ignore : on retourne un tableau vide ci-dessous.
  }
  return [];
}

export interface ParseAPKGOptions {
  /** Si vrai, préserve l'historique de révision (stats FSRS converties). */
  preserveHistory?: boolean;
  /** Nom de fichier (sans extension) utilisé en fallback si aucun nom de deck trouvé. */
  fallbackName?: string;
  /** Liste des deck Anki IDs à importer. Si absent ou vide → tous les decks. */
  selectedDeckIds?: number[];
  /**
   * Mode d'agrégation quand plusieurs decks sont sélectionnés :
   *   - 'split' : un ParsedDeck par deck Anki sélectionné.
   *   - 'merge' : un seul ParsedDeck agrégeant toutes les cartes (défaut historique).
   */
  mergeMode?: 'split' | 'merge';
  /** Nom à utiliser pour le deck unique en mode 'merge'. */
  mergedDeckName?: string;
}

/**
 * Ouvre l'archive .apkg, en extrait la base SQLite et instancie la connexion sql.js.
 * Le caller a la responsabilité d'appeler `db.close()` après usage.
 */
async function openAPKGDatabase(fileBuffer: ArrayBuffer): Promise<Database> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(fileBuffer);
  } catch (err) {
    throw new Error(
      `Fichier .apkg invalide (archive ZIP corrompue) : ${(err as Error).message}`
    );
  }
  const sqliteBuffer = await extractSqliteBuffer(zip);
  const SQL = await loadSqlJs();
  return new SQL.Database(sqliteBuffer);
}

/**
 * Analyse un .apkg sans construire les ParsedCards : retourne uniquement la liste
 * des decks détectés (et leur nombre de cartes). Utilisé par l'UI pour permettre
 * à l'utilisateur de choisir quels decks importer.
 */
export async function analyzeAPKG(fileBuffer: ArrayBuffer): Promise<APKGDeckSummary[]> {
  const db = await openAPKGDatabase(fileBuffer);
  try {
    return listAPKGDecks(db);
  } finally {
    db.close();
  }
}

/**
 * Extrait les ParsedCards pour un ensemble de deck IDs Anki (ou toutes les cartes
 * si `ankiIds` est null). Retourne un Map deckAnkiId → ParsedCards correspondants.
 */
function extractParsedCardsByDeck(
  db: Database,
  ankiIds: number[] | null,
  preserveHistory: boolean
): Map<number, ParsedCard[]> {
  // Notes (id → flds[])
  const noteRows = queryAll<{ id: number; flds: string }>(
    db,
    `SELECT id, flds FROM notes`
  );
  const notesById = new Map<number, string[]>();
  for (const n of noteRows) {
    notesById.set(n.id, (n.flds || '').split(ANKI_FIELD_SEPARATOR));
  }

  // Cards (filtrées par deck ID si demandé)
  let cardSql = `SELECT id, nid, did, ord, type, queue, ivl, factor, reps, lapses, data
                   FROM cards
                  WHERE queue >= 0`;
  if (ankiIds && ankiIds.length > 0) {
    // sql.js ne supporte pas les array params nativement ; on inline les IDs
    // (validés en amont — ce sont des entiers issus de la table decks).
    const safe = ankiIds.filter((n) => Number.isFinite(n)).map((n) => Math.trunc(n));
    if (safe.length === 0) return new Map();
    cardSql += ` AND did IN (${safe.join(',')})`;
  }
  cardSql += ` ORDER BY id ASC`;

  const cardRows = queryAll<{
    id: number;
    nid: number;
    did: number;
    ord: number;
    type: number;
    queue: number;
    ivl: number;
    factor: number;
    reps: number;
    lapses: number;
    data: string | null;
  }>(db, cardSql);

  // Revlog (groupé par cid) — uniquement si preserveHistory.
  const revlogByCard = new Map<number, AnkiRevlogRow[]>();
  if (preserveHistory) {
    const revlogRows = queryAll<{ id: number; cid: number; ease: number; type: number }>(
      db,
      `SELECT id, cid, ease, type FROM revlog WHERE ease BETWEEN 1 AND 4`
    );
    for (const r of revlogRows) {
      const list = revlogByCard.get(r.cid);
      if (list) list.push({ id: r.id, ease: r.ease, type: r.type });
      else revlogByCard.set(r.cid, [{ id: r.id, ease: r.ease, type: r.type }]);
    }
  }

  const byDeck = new Map<number, ParsedCard[]>();
  for (const c of cardRows) {
    const flds = notesById.get(c.nid);
    if (!flds) continue;

    const { front: rawFront, back: rawBack } = pickFrontBack(flds, c.ord);
    const front = cleanAnkiHtml(rawFront);
    const back = cleanAnkiHtml(rawBack);

    if (!front && !back) continue;

    const cardRow: AnkiCardRow = {
      type: c.type,
      queue: c.queue,
      ivl: c.ivl,
      factor: c.factor,
      reps: c.reps,
      lapses: c.lapses,
      data: c.data,
    };
    const stats = convertAnkiCardToReviewStats(
      cardRow,
      revlogByCard.get(c.id) ?? [],
      preserveHistory
    );

    const list = byDeck.get(c.did);
    const parsed: ParsedCard = {
      front,
      back,
      frontType: detectContentType(front),
      backType: detectContentType(back),
      stats: preserveHistory ? stats : undefined,
    };
    if (list) list.push(parsed);
    else byDeck.set(c.did, [parsed]);
  }

  return byDeck;
}

/**
 * Point d'entrée principal : transforme un .apkg en un ou plusieurs `ParsedDeck`
 * selon les options de sélection / fusion.
 *
 * - Aucune option → renvoie un unique ParsedDeck contenant toutes les cartes,
 *   nommé d'après le deck Anki principal (rétro-compat avec l'ancien comportement).
 * - `selectedDeckIds` fourni + `mergeMode === 'split'` (défaut) → un ParsedDeck
 *   par deck Anki sélectionné.
 * - `selectedDeckIds` fourni + `mergeMode === 'merge'` → un unique ParsedDeck
 *   nommé `mergedDeckName` (ou `fallbackName`) agrégeant les cartes sélectionnées.
 */
export async function parseAPKG(
  fileBuffer: ArrayBuffer,
  options: ParseAPKGOptions = {}
): Promise<ParsedDeck[]> {
  const {
    preserveHistory = false,
    fallbackName = 'Deck Anki importé',
    selectedDeckIds,
    mergeMode = 'split',
    mergedDeckName,
  } = options;

  const db = await openAPKGDatabase(fileBuffer);

  try {
    const allDecks = listAPKGDecks(db);
    if (allDecks.length === 0) {
      throw new Error('Aucune carte importable trouvée dans le deck Anki.');
    }

    // Détermine les decks effectivement importés.
    const targetDecks = selectedDeckIds && selectedDeckIds.length > 0
      ? allDecks.filter((d) => selectedDeckIds.includes(d.ankiId))
      : allDecks;

    if (targetDecks.length === 0) {
      throw new Error('Aucun deck sélectionné pour l\'import.');
    }

    const ankiIdsFilter = selectedDeckIds && selectedDeckIds.length > 0
      ? targetDecks.map((d) => d.ankiId)
      : null;

    const cardsByDeck = extractParsedCardsByDeck(db, ankiIdsFilter, preserveHistory);

    // Mode merge OU appel sans sélection (rétro-compat : un seul ParsedDeck).
    if (mergeMode === 'merge' || !selectedDeckIds || selectedDeckIds.length === 0) {
      const allCards: ParsedCard[] = [];
      for (const deck of targetDecks) {
        const cards = cardsByDeck.get(deck.ankiId);
        if (cards) allCards.push(...cards);
      }
      if (allCards.length === 0) {
        throw new Error(
          'Aucune carte avec contenu textuel trouvée. Les notetypes complexes (Cloze, Image Occlusion) ne sont pas encore supportés.'
        );
      }

      // Choix du nom : nom personnalisé > nom du fichier > nom du deck Anki principal.
      let name: string;
      if (mergeMode === 'merge') {
        name = (mergedDeckName && mergedDeckName.trim()) || fallbackName;
      } else {
        // Rétro-compat : nom du deck Anki avec le plus de cartes.
        name = targetDecks[0].name || fallbackName;
      }

      return [{ name, cards: allCards }];
    }

    // Mode split : un ParsedDeck par deck Anki sélectionné, dans l'ordre demandé.
    const result: ParsedDeck[] = [];
    for (const deck of targetDecks) {
      const cards = cardsByDeck.get(deck.ankiId);
      if (!cards || cards.length === 0) continue;
      result.push({ name: deck.name || fallbackName, cards });
    }

    if (result.length === 0) {
      throw new Error(
        'Aucune carte avec contenu textuel trouvée. Les notetypes complexes (Cloze, Image Occlusion) ne sont pas encore supportés.'
      );
    }

    return result;
  } finally {
    db.close();
  }
}

