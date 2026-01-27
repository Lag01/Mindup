'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardChoiceModal from './DashboardChoiceModal';
import DashboardFeedbackModal from './DashboardFeedbackModal';
import LoadingAnimation from './LoadingAnimation';
import { useToast } from '@/hooks/useToast';
import { shouldShowFeedbackModal } from '@/lib/dashboard-utils';

interface PreferencesData {
  version: string | null;
  choiceDate: Date | null;
  feedbackGiven: boolean;
  feedbackRating: number | null;
}

export default function DashboardRedirector() {
  const router = useRouter();
  const { success, error, ToastContainer } = useToast();

  const [loading, setLoading] = useState(true);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [preferences, setPreferences] = useState<PreferencesData | null>(null);

  // Charger les préférences au montage
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/user/dashboard-preference');
        if (!response.ok) throw new Error('Erreur de chargement');

        const data = await response.json();
        const prefs: PreferencesData = {
          version: data.version,
          choiceDate: data.choiceDate ? new Date(data.choiceDate) : null,
          feedbackGiven: data.feedbackGiven,
          feedbackRating: data.feedbackRating,
        };

        setPreferences(prefs);

        // Déterminer quelle action prendre
        if (prefs.version === null) {
          // Pas encore choisi → afficher le modal de choix
          setShowChoiceModal(true);
          setLoading(false);
        } else if (
          shouldShowFeedbackModal(
            prefs.version,
            prefs.choiceDate,
            prefs.feedbackGiven
          )
        ) {
          // Afficher le modal de feedback (v2 + 3 jours)
          setShowFeedbackModal(true);
          setLoading(false);
        } else {
          // Redirection directe vers le bon dashboard
          const targetPath = prefs.version === 'v1' ? '/dashboard' : '/dashboard-v2';
          router.push(targetPath);
        }
      } catch (err) {
        console.error('Error fetching preferences:', err);
        error('Erreur lors du chargement des préférences');
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [router, error]);

  // Gérer le choix de version
  const handleChoose = async (version: 'v1' | 'v2') => {
    try {
      const response = await fetch('/api/user/dashboard-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });

      if (!response.ok) throw new Error('Erreur de sauvegarde');

      setShowChoiceModal(false);

      // Toast différent selon le choix
      if (version === 'v2') {
        success('Bienvenue dans la nouvelle version !');
      } else {
        success('Préférence sauvegardée !');
      }

      // Redirection
      const targetPath = version === 'v1' ? '/dashboard' : '/dashboard-v2';
      router.push(targetPath);
    } catch (err) {
      console.error('Error saving preference:', err);
      error('Erreur lors de la sauvegarde');
    }
  };

  // Gérer le feedback
  const handleFeedback = async (rating: number, switchBack: boolean) => {
    try {
      const response = await fetch('/api/user/dashboard-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, switchBack }),
      });

      if (!response.ok) throw new Error('Erreur de sauvegarde');

      const data = await response.json();
      setShowFeedbackModal(false);

      // Toast selon le choix
      if (switchBack) {
        success('Vous êtes de retour sur l\'ancienne version');
      } else {
        success('Merci pour votre retour !');
      }

      // Redirection
      const targetPath = data.newVersion === 'v1' ? '/dashboard' : '/dashboard-v2';
      router.push(targetPath);
    } catch (err) {
      console.error('Error saving feedback:', err);
      error('Erreur lors de la sauvegarde');
    }
  };

  // Fermer le modal de choix sans sauvegarder
  const handleCloseLater = () => {
    setShowChoiceModal(false);
    // Rediriger vers la page d'accueil ou afficher un message
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <DashboardChoiceModal
        isOpen={showChoiceModal}
        onChoose={handleChoose}
        onClose={handleCloseLater}
      />

      <DashboardFeedbackModal
        isOpen={showFeedbackModal}
        onSubmit={handleFeedback}
        onClose={() => {
          setShowFeedbackModal(false);
          // Continuer vers le dashboard v2 sans sauvegarder
          router.push('/dashboard-v2');
        }}
      />

      <ToastContainer />
    </>
  );
}
