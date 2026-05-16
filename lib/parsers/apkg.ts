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

/**
 * Détermine le nom du deck à utiliser. Anki peut contenir plusieurs decks ;
 * on prend celui qui contient le plus de cartes. Aplatit les sous-decks séparés
 * par \x1f en " :: ".
 */
function pickDeckName(
  db: Database,
  fallback: string
): string {
  // La table 'decks' n'existe que dans le schéma anki21b/anki21 ; sur anki2 (legacy)
  // les decks sont dans col.decks (JSON). On tente d'abord la table moderne.
  try {
    const rows = queryAll<{ id: number; name: string }>(
      db,
      `SELECT d.id, d.name
         FROM decks d
         LEFT JOIN cards c ON c.did = d.id
         WHERE d.id != 1
         GROUP BY d.id
         ORDER BY COUNT(c.id) DESC
         LIMIT 1`
    );
    if (rows.length > 0 && rows[0].name) {
      return rows[0].name.split(ANKI_FIELD_SEPARATOR).join(' :: ');
    }
    // Si seul "Default" existe (id=1), on tente quand même
    const def = queryAll<{ name: string }>(db, `SELECT name FROM decks WHERE id = 1`);
    if (def.length > 0) {
      return def[0].name.split(ANKI_FIELD_SEPARATOR).join(' :: ');
    }
  } catch {
    // Schéma legacy : col.decks contient un JSON
    try {
      const col = queryAll<{ decks: string }>(db, `SELECT decks FROM col LIMIT 1`);
      if (col.length > 0 && col[0].decks) {
        const decks = JSON.parse(col[0].decks) as Record<string, { name: string }>;
        const values = Object.values(decks);
        if (values.length > 0) {
          return values[0].name.split(ANKI_FIELD_SEPARATOR).join(' :: ');
        }
      }
    } catch {
      // ignore et fallback
    }
  }
  return fallback;
}

export interface ParseAPKGOptions {
  /** Si vrai, préserve l'historique de révision (stats FSRS converties). */
  preserveHistory?: boolean;
  /** Nom de fichier (sans extension) utilisé en fallback si aucun nom de deck trouvé. */
  fallbackName?: string;
}

/**
 * Point d'entrée : transforme un .apkg en ParsedDeck prêt à insérer en DB.
 */
export async function parseAPKG(
  fileBuffer: ArrayBuffer,
  options: ParseAPKGOptions = {}
): Promise<ParsedDeck> {
  const { preserveHistory = false, fallbackName = 'Deck Anki importé' } = options;

  // 1. Décompression ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(fileBuffer);
  } catch (err) {
    throw new Error(
      `Fichier .apkg invalide (archive ZIP corrompue) : ${(err as Error).message}`
    );
  }

  // 2. Extraction SQLite
  const sqliteBuffer = await extractSqliteBuffer(zip);

  // 3. Ouverture sql.js
  const SQL = await loadSqlJs();
  const db = new SQL.Database(sqliteBuffer);

  try {
    // 4. Nom du deck
    const deckName = pickDeckName(db, fallbackName);

    // 5. Notes (id → flds[])
    const noteRows = queryAll<{ id: number; flds: string }>(
      db,
      `SELECT id, flds FROM notes`
    );
    const notesById = new Map<number, string[]>();
    for (const n of noteRows) {
      notesById.set(n.id, (n.flds || '').split(ANKI_FIELD_SEPARATOR));
    }

    // 6. Cards (on exclut les suspended/buried : queue < 0)
    const cardRows = queryAll<{
      id: number;
      nid: number;
      ord: number;
      type: number;
      queue: number;
      ivl: number;
      factor: number;
      reps: number;
      lapses: number;
      data: string | null;
    }>(
      db,
      `SELECT id, nid, ord, type, queue, ivl, factor, reps, lapses, data
         FROM cards
        WHERE queue >= 0
        ORDER BY id ASC`
    );

    if (cardRows.length === 0) {
      throw new Error('Aucune carte importable trouvée dans le deck Anki.');
    }

    // 7. Revlog (groupé par cid) — uniquement si preserveHistory pour économiser
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

    // 8. Construction des ParsedCard
    const cards: ParsedCard[] = [];
    for (const c of cardRows) {
      const flds = notesById.get(c.nid);
      if (!flds) continue; // note manquante (incohérence)

      const { front: rawFront, back: rawBack } = pickFrontBack(flds, c.ord);
      const front = cleanAnkiHtml(rawFront);
      const back = cleanAnkiHtml(rawBack);

      // Sauter les cartes totalement vides (peut arriver pour notetypes Cloze
      // dont le template ne génère rien à partir du champ sélectionné).
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

      cards.push({
        front,
        back,
        frontType: detectContentType(front),
        backType: detectContentType(back),
        stats: preserveHistory ? stats : undefined,
      });
    }

    if (cards.length === 0) {
      throw new Error(
        'Aucune carte avec contenu textuel trouvée. Les notetypes complexes (Cloze, Image Occlusion) ne sont pas encore supportés.'
      );
    }

    return {
      name: deckName,
      cards,
    };
  } finally {
    db.close();
  }
}

