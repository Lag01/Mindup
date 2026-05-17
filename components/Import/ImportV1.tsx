'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimpleHeader from '@/components/SimpleHeader';
import DeckSelectionModal, {
  type APKGDeckSummary,
  type DeckSelectionResult,
} from '@/components/Import/DeckSelectionModal';
import { invalidateFetchCache } from '@/hooks/useFetch';

const ACCEPTED_EXTENSIONS = ['xml', 'csv', 'apkg'] as const;

type DestinationMode = 'new' | 'append';

interface UserDeckSummary {
  id: string;
  name: string;
  totalCards: number;
  isImported: boolean;
}

export default function ImportV1() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preserveHistory, setPreserveHistory] = useState(true);
  const [pendingDecks, setPendingDecks] = useState<APKGDeckSummary[] | null>(null);
  const [pendingFallbackName, setPendingFallbackName] = useState('');
  const [destination, setDestination] = useState<DestinationMode>('new');
  const [userDecks, setUserDecks] = useState<UserDeckSummary[]>([]);
  const [targetDeckId, setTargetDeckId] = useState('');
  const router = useRouter();

  const fileExtension = file?.name.split('.').pop()?.toLowerCase();
  const isApkg = fileExtension === 'apkg';
  const canAppend = !isApkg;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/decks');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data.decks)) return;
        const eligible: UserDeckSummary[] = data.decks
          .filter((d: UserDeckSummary) => !d.isImported)
          .map((d: UserDeckSummary) => ({
            id: d.id,
            name: d.name,
            totalCards: d.totalCards,
            isImported: d.isImported,
          }));
        setUserDecks(eligible);
        if (eligible.length > 0) setTargetDeckId((prev) => prev || eligible[0].id);
      } catch {
        // Silencieux : si la liste échoue, l'utilisateur reste en mode "nouveau deck".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canAppend && destination === 'append') {
      setDestination('new');
    }
  }, [canAppend, destination]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!extension || !(ACCEPTED_EXTENSIONS as readonly string[]).includes(extension)) {
        setError('Format de fichier non supporté. Utilisez .apkg, .xml ou .csv');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setSuccess('');
    }
  };

  const finalizeImport = (deckCount: number, firstDeckName: string, totalCards: number) => {
    invalidateFetchCache('/api/decks');
    invalidateFetchCache();
    setSuccess(
      deckCount > 1
        ? `${deckCount} decks importés avec succès (${totalCards} cartes au total). Redirection…`
        : `Deck "${firstDeckName}" importé avec succès (${totalCards} cartes). Redirection…`
    );
    setFile(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    // Redirection rapide ; le router.refresh() invalide aussi le payload des
    // Server Components en amont si nécessaire.
    setTimeout(() => {
      router.push('/dashboard-entry');
      router.refresh();
    }, 300);
  };

  const finalizeAppend = (deckId: string, deckName: string, addedCards: number) => {
    invalidateFetchCache('/api/decks');
    invalidateFetchCache();
    setSuccess(
      `${addedCards} carte${addedCards > 1 ? 's' : ''} ajoutée${addedCards > 1 ? 's' : ''} au deck « ${deckName} ». Redirection…`
    );
    setFile(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    setTimeout(() => {
      router.push(`/deck/${deckId}`);
      router.refresh();
    }, 600);
  };

  const performImport = async (
    targetFile: File,
    selection: DeckSelectionResult | null
  ) => {
    const formData = new FormData();
    formData.append('file', targetFile);
    if (targetFile.name.toLowerCase().endsWith('.apkg')) {
      formData.append('preserveHistory', String(preserveHistory));
    }
    if (selection) {
      formData.append('selectedDeckIds', JSON.stringify(selection.selectedIds));
      formData.append('mergeMode', selection.mode);
      if (selection.mode === 'merge') {
        formData.append('mergedDeckName', selection.mergedName);
      }
    }

    const isAppendMode = destination === 'append' && canAppend && !!targetDeckId;
    if (isAppendMode) {
      formData.append('targetDeckId', targetDeckId);
    }

    const response = await fetch('/api/import', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'importation');
    }

    if (data.mode === 'append' && data.deck) {
      finalizeAppend(data.deck.id, data.deck.name, data.deck.addedCards ?? 0);
      return;
    }

    const decks = Array.isArray(data.decks) ? data.decks : [data.deck];
    const totalCards = decks.reduce(
      (sum: number, d: { cardsCount: number }) => sum + (d?.cardsCount || 0),
      0
    );
    finalizeImport(decks.length, decks[0]?.name || 'Deck', totalCards);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Étape 1 : analyse côté serveur pour détecter les decks (APKG multi-deck).
      const analyzeForm = new FormData();
      analyzeForm.append('file', file);
      const analyzeRes = await fetch('/api/import/analyze', {
        method: 'POST',
        body: analyzeForm,
      });
      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        setError(analyzeData.error || 'Erreur lors de l\'analyse du fichier');
        setLoading(false);
        return;
      }

      // Étape 2a : APKG avec plusieurs decks → ouvrir la modale de sélection.
      if (
        analyzeData.format === 'apkg' &&
        Array.isArray(analyzeData.decks) &&
        analyzeData.decks.length > 1
      ) {
        setPendingDecks(analyzeData.decks);
        setPendingFallbackName(analyzeData.fallbackName || file.name);
        setLoading(false);
        return;
      }

      // Étape 2b : sinon, import direct.
      await performImport(file, null);
    } catch (err: any) {
      setError(err?.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionConfirm = async (selection: DeckSelectionResult) => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      await performImport(file, selection);
      setPendingDecks(null);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'importation');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionCancel = () => {
    setPendingDecks(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <SimpleHeader
        title="Importer un deck"
        backButton={{ label: "Retour", href: "/dashboard-entry" }}
      />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-zinc-900 rounded-lg p-8 border border-zinc-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Sélectionner un fichier
              </label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file-input"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-zinc-700 border-dashed rounded-lg cursor-pointer bg-zinc-800 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-10 h-10 mb-3 text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-zinc-400">
                      <span className="font-semibold">Cliquez pour sélectionner</span> ou glissez-déposez
                    </p>
                    <p className="text-xs text-zinc-500">
                      Formats supportés : APKG (Anki), XML, CSV
                    </p>
                    {file && (
                      <p className="mt-3 text-sm text-blue-400 font-medium">
                        {file.name}
                      </p>
                    )}
                  </div>
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept=".apkg,.xml,.csv"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-zinc-200">Destination</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="destination-v1"
                  value="new"
                  checked={destination === 'new'}
                  onChange={() => setDestination('new')}
                  className="mt-1 h-4 w-4 border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm text-zinc-200">Créer un nouveau deck</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Les cartes du fichier formeront un nouveau deck dans votre liste.
                  </p>
                </div>
              </label>
              <label
                className={`flex items-start gap-3 ${
                  canAppend && userDecks.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <input
                  type="radio"
                  name="destination-v1"
                  value="append"
                  checked={destination === 'append'}
                  onChange={() => setDestination('append')}
                  disabled={!canAppend || userDecks.length === 0}
                  className="mt-1 h-4 w-4 border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">Ajouter à un deck existant</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {!canAppend
                      ? 'Disponible uniquement pour les fichiers CSV et XML.'
                      : userDecks.length === 0
                        ? 'Aucun deck éligible (les decks importés sont exclus).'
                        : 'Les cartes seront ajoutées à la fin du deck choisi.'}
                  </p>
                  {destination === 'append' && canAppend && userDecks.length > 0 && (
                    <select
                      value={targetDeckId}
                      onChange={(e) => setTargetDeckId(e.target.value)}
                      className="mt-2 w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {userDecks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.totalCards} carte{d.totalCards > 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            </div>

            {isApkg && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveHistory}
                    onChange={(e) => setPreserveHistory(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Préserver mon historique de révision Anki
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Conserve intervalles, répétitions et lapses (conversion SM-2 → FSRS-5).
                    </p>
                  </div>
                </label>
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-900/30 border border-green-500 text-green-200 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {loading ? 'Importation en cours...' : 'Importer'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-zinc-800 rounded-lg">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Format APKG (Anki) :</h3>
            <p className="text-xs text-zinc-400 mb-1">
              Export Anki Desktop : Fichier → Exporter → Package Anki.
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              Médias ignorés. Limite 4 Mo.
            </p>
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Format XML attendu :</h3>
            <pre className="text-xs text-zinc-400 overflow-x-auto">
{`<deck name="Mon Deck">
  <cards>
    <card>
      <tex name='Front'>Question</tex>
      <tex name='Back'>Réponse</tex>
    </card>
  </cards>
</deck>`}
            </pre>
            <h3 className="text-sm font-medium text-zinc-300 mb-2 mt-4">Format CSV attendu :</h3>
            <pre className="text-xs text-zinc-400 overflow-x-auto">
{`Front,Back
Question 1,Réponse 1
Question 2,Réponse 2`}
            </pre>
          </div>
        </div>
      </main>

      <DeckSelectionModal
        isOpen={pendingDecks !== null}
        decks={pendingDecks ?? []}
        defaultMergedName={pendingFallbackName}
        isSubmitting={loading}
        onConfirm={handleSelectionConfirm}
        onCancel={handleSelectionCancel}
      />
    </div>
  );
}
