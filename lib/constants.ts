// Durée du cache pour les requêtes GET (5 minutes)
export const CACHE_TTL_MS = 5 * 60 * 1000;

// Taille maximale du cache (nombre d'entrées)
export const CACHE_MAX_SIZE = 100;

// Taille maximale des images uploadées (en MB)
export const IMAGE_MAX_SIZE_MB = 3;

// Longueur maximale du contenu d'une carte (en caractères)
export const CARD_MAX_CONTENT_LENGTH = 10_000;

// Endpoints API
export const API_ROUTES = {
  DECKS: '/api/decks',
  STATS_GLOBAL: '/api/stats/global',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_SIGNUP: '/api/auth/signup',
  AUTH_ME: '/api/auth/me',
  LEADERBOARD: '/api/leaderboard',
  LEADERBOARD_STREAK: '/api/leaderboard/streak',
} as const;

// Taille maximale du tableau de résultats dans le leaderboard
export const LEADERBOARD_PAGE_SIZE = 20;
