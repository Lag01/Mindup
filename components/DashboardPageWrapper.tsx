'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingAnimation from './LoadingAnimation';

interface DashboardPageWrapperProps {
  children: React.ReactNode;
  expectedVersion: 'v1' | 'v2' | 'v3' | null; // null = accepte toutes les versions
}

/**
 * Wrapper pour les pages dashboard qui vérifie la préférence utilisateur
 * et redirige si nécessaire
 */
export default function DashboardPageWrapper({ children, expectedVersion }: DashboardPageWrapperProps) {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkDashboardPreference() {
      try {
        const response = await fetch('/api/user/dashboard-preference');

        if (!response.ok) {
          // Si erreur, rediriger vers dashboard-entry
          router.push('/dashboard-entry');
          return;
        }

        const data = await response.json();
        const userVersion = data.dashboardVersion;

        // Si l'utilisateur n'a pas de préférence, rediriger vers dashboard-entry
        if (userVersion === null) {
          router.push('/dashboard-entry');
          return;
        }

        // Si cette page a une version attendue et que l'utilisateur n'est pas sur la bonne version
        if (expectedVersion && userVersion !== expectedVersion) {
          // Rediriger vers le bon dashboard
          const targetPath = userVersion === 'v1' ? '/dashboard' : `/dashboard-${userVersion}`;
          router.push(targetPath);
          return;
        }

        // Tout est bon, afficher la page
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking dashboard preference:', error);
        // En cas d'erreur, rediriger vers dashboard-entry
        router.push('/dashboard-entry');
      }
    }

    checkDashboardPreference();
  }, [router, expectedVersion]);

  if (isChecking) {
    return <LoadingAnimation fullScreen />;
  }

  return <>{children}</>;
}
