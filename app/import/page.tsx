'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Importer un deck</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Retour
          </button>
        </div>
      </header>

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
                      Formats supportés : XML, CSV
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
                    accept=".xml,.csv"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

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
