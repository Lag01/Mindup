import fs from 'fs';
import path from 'path';

interface MotivationPhrases {
  streakActive: string[];
  noStreak: string[];
}

let cachedPhrases: MotivationPhrases | null = null;

/**
 * Charge les phrases de motivation depuis le fichier JSON
 */
function loadMotivationPhrases(): MotivationPhrases {
  if (cachedPhrases) {
    return cachedPhrases;
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'motivation-phrases.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    cachedPhrases = JSON.parse(fileContent);
    return cachedPhrases!;
  } catch (error) {
    console.error('Error loading motivation phrases:', error);

    // Fallback si le fichier n'existe pas
    return {
      streakActive: [
        "🔥 Ton streak de {days} jour{s} est en danger ! Révise aujourd'hui pour le maintenir."
      ],
      noStreak: [
        "Je croyais que tu voulais t'améliorer ? 🤔"
      ]
    };
  }
}

/**
 * Choisit une phrase de motivation aléatoire
 * @param hasActiveStreak - Si l'utilisateur a un streak actif
 * @param streakDays - Nombre de jours du streak (si applicable)
 * @returns Le message de motivation formaté
 */
export function getRandomMotivationMessage(
  hasActiveStreak: boolean,
  streakDays: number = 0
): string {
  const phrases = loadMotivationPhrases();
  const phrasesArray = hasActiveStreak ? phrases.streakActive : phrases.noStreak;

  // Choisir une phrase aléatoire
  const randomIndex = Math.floor(Math.random() * phrasesArray.length);
  let message = phrasesArray[randomIndex];

  // Remplacer les placeholders si c'est un message de streak
  if (hasActiveStreak && streakDays > 0) {
    message = message
      .replace(/{days}/g, streakDays.toString())
      .replace(/{s}/g, streakDays > 1 ? 's' : '');
  }

  return message;
}

/**
 * Invalide le cache des phrases (utile si le fichier est modifié)
 */
export function clearMotivationCache(): void {
  cachedPhrases = null;
}
