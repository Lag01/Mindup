/**
 * Détermine si le popup de feedback doit être affiché
 * @param dashboardVersion - Version actuelle du dashboard ("v1", "v2", ou null)
 * @param choiceDate - Date du choix initial
 * @param feedbackGiven - Feedback déjà donné ou non
 * @returns true si le popup doit être affiché
 */
export function shouldShowFeedbackModal(
  dashboardVersion: string | null,
  choiceDate: Date | null,
  feedbackGiven: boolean
): boolean {
  // Seulement pour les utilisateurs v2 qui n'ont pas encore donné de feedback
  if (dashboardVersion !== 'v2' || feedbackGiven || !choiceDate) {
    return false;
  }

  const now = new Date();
  const diffTime = now.getTime() - choiceDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 3;
}
