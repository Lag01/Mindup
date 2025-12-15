import { useState, useCallback } from 'react';

// Cache global pour les requêtes GET
// Clé: URL → Valeur: { data, timestamp }
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface UseFetchOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  initialData?: T;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (url: string, options?: RequestInit) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook générique pour les requêtes fetch
 * Élimine la duplication de logique de loading/error/data
 *
 * @param options - Options de configuration
 * @returns Objet contenant data, loading, error, execute, reset
 *
 * @example
 * const { data, loading, error, execute } = useFetch<Deck>({
 *   onSuccess: (deck) => console.log('Deck chargé:', deck),
 *   onError: (err) => alert(err.message),
 * });
 *
 * // Exécuter une requête
 * useEffect(() => {
 *   execute(`/api/decks/${deckId}`);
 * }, [deckId]);
 *
 * // Requête POST
 * const handleCreate = async () => {
 *   await execute('/api/decks', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ name: 'New Deck' }),
 *   });
 * };
 */
export function useFetch<T = unknown>(
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const { onSuccess, onError, initialData } = options;

  const [data, setData] = useState<T | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (url: string, fetchOptions?: RequestInit): Promise<T | null> => {
      const method = fetchOptions?.method?.toUpperCase() || 'GET';

      // Vérifier le cache pour les requêtes GET uniquement
      if (method === 'GET') {
        const cached = cache.get(url);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          // Cache hit - retourner les données sans fetch
          setData(cached.data);
          setLoading(false);
          setError(null);

          // Callback de succès avec données cachées
          if (onSuccess) {
            onSuccess(cached.data);
          }

          return cached.data;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, fetchOptions);

        // Gestion des erreurs HTTP
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error || `Erreur HTTP ${response.status}`;
          throw new Error(errorMessage);
        }

        // Parser la réponse JSON
        const result = await response.json();
        setData(result);

        // Mettre en cache si requête GET
        if (method === 'GET') {
          cache.set(url, { data: result, timestamp: Date.now() });
        }

        // Callback de succès
        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Callback d'erreur
        if (onError) {
          onError(error);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(initialData ?? null);
    setLoading(false);
    setError(null);
  }, [initialData]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}
