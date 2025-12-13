import { useEffect, useState } from 'react';

/**
 * Hook pour debouncer une valeur
 * Utile pour éviter les requêtes trop fréquentes lors de la saisie
 *
 * @param value - La valeur à debouncer
 * @param delay - Le délai en millisecondes (par défaut 300ms)
 * @returns La valeur debouncée
 *
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 300);
 *
 * useEffect(() => {
 *   // Cette requête ne se déclenche que 300ms après la fin de la saisie
 *   fetchResults(debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Définir un timer qui mettra à jour la valeur après le délai
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
