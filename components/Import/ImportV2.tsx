'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportV2() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (extension !== 'xml' && extension !== 'csv') {
        setError('Format de fichier non supporté. Utilisez .xml ou .csv');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setSuccess('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const extension = droppedFile.name.split('.').pop()?.toLowerCase();
      if (extension !== 'xml' && extension !== 'csv') {
        setError('Format de fichier non supporté. Utilisez .xml ou .csv');
        setFile(null);
        return;
      }
      setFile(droppedFile);
      setError('');
      setSuccess('');
    }
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'importation');
        setLoading(false);
        return;
      }

      setSuccess(`Deck "${data.deck.name}" importé avec succès (${data.deck.cardsCount} cartes)`);
      setFile(null);

      // Reset file input
      const fileInput = document.getElementById('file-input-v2') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard-entry');
      }, 2000);
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header V2 */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-[60px] flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-foreground">
            Importer un deck
          </h1>
          <button
            onClick={() => router.push('/dashboard-entry')}
            className="bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-300 font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm whitespace-nowrap border border-zinc-700/50"
          >
            Retour
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-8 border border-zinc-800/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Sélectionner un fichier
              </label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file-input-v2"
                  className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                    isDragOver
                      ? 'border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)]'
                      : file
                        ? 'border-blue-500/30 bg-blue-500/5'
                        : 'border-zinc-700/50 bg-zinc-800/50 hover:border-cyan-500/20 hover:bg-zinc-800/30 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.1)]'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className={`w-10 h-10 mb-3 transition-colors duration-300 ${
                        isDragOver ? 'text-cyan-400' : file ? 'text-blue-400' : 'text-zinc-500'
                      }`}
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
                      Formats supportés : XML, CSV
                    </p>
                    {file && (
                      <p className="mt-3 text-sm text-cyan-400 font-medium">
                        {file.name}
                      </p>
                    )}
                  </div>
                  <input
                    id="file-input-v2"
                    type="file"
                    className="hidden"
                    accept=".xml,.csv"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 disabled:shadow-none"
            >
              {loading ? 'Importation en cours...' : 'Importer'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
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
    </div>
  );
}
