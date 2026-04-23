import { CARD_MAX_CONTENT_LENGTH } from '@/lib/constants';

const MAX_CONTENT_LENGTH = CARD_MAX_CONTENT_LENGTH;

export function validateCardContent(
  front: string,
  back: string,
  frontType: string,
  backType: string
): { valid: boolean; error?: string } {
  // Validation de la longueur
  if (front && front.length > MAX_CONTENT_LENGTH) {
    return { valid: false, error: 'Contenu recto trop long (max 10KB)' };
  }
  if (back && back.length > MAX_CONTENT_LENGTH) {
    return { valid: false, error: 'Contenu verso trop long (max 10KB)' };
  }

  // Valider LaTeX (bloquer commandes dangereuses)
  if (frontType === 'LATEX' && !isValidLaTeX(front)) {
    return { valid: false, error: 'LaTeX invalide au recto : commandes dangereuses détectées' };
  }
  if (backType === 'LATEX' && !isValidLaTeX(back)) {
    return { valid: false, error: 'LaTeX invalide au verso : commandes dangereuses détectées' };
  }

  return { valid: true };
}

function isValidLaTeX(latex: string): boolean {
  if (!latex) return true;

  // Bloquer commandes LaTeX dangereuses qui peuvent lire/écrire des fichiers ou exécuter du code
  const dangerous = [
    '\\input',        // Inclure un fichier
    '\\include',      // Inclure un fichier
    '\\write',        // Écrire dans un fichier
    '\\immediate',    // Exécution immédiate
    '\\openin',       // Ouvrir un fichier en lecture
    '\\openout',      // Ouvrir un fichier en écriture
    '\\csname',       // Peut créer des commandes arbitraires
    '\\expandafter',  // Expansion de macros potentiellement dangereuse
    '\\documentclass',// Commande de document entier (non supportée par KaTeX)
    '\\usepackage',   // Import de paquets arbitraires
    '\\newcommand',   // Définition de nouvelles commandes arbitraires
    '\\def',          // Définition de macros bas-niveau
    '\\let',          // Redéfinition de commandes
    '\\catcode',      // Modification des codes de catégorie TeX
    '\\jobname',      // Accès au nom du fichier courant
    '\\output',       // Routine de sortie TeX
  ];

  return !dangerous.some(cmd => latex.includes(cmd));
}
