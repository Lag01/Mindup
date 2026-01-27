import DashboardRedirector from '@/components/DashboardRedirector';

/**
 * Point d'entrée unique pour tous les utilisateurs connectés
 * Gère la redirection vers le bon dashboard selon les préférences
 */
export default function DashboardEntry() {
  return <DashboardRedirector />;
}
