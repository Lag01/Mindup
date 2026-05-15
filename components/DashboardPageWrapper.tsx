'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingAnimation from './LoadingAnimation';

interface DashboardPageWrapperProps {
  children: React.ReactNode;
  expectedVersion: 'v1' | 'v3';
}

/**
 * Vérifie que l'utilisateur a bien le droit d'être sur cette version du dashboard.
 * - Non-admin sur v3 -> redirigé vers v1
 * - Admin avec préférence différente -> redirigé vers sa préférence
 */
export default function DashboardPageWrapper({ children, expectedVersion }: DashboardPageWrapperProps) {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkDashboardPreference() {
      try {
        const response = await fetch('/api/user/dashboard-preference');

        if (!response.ok) {
          router.replace('/dashboard-entry');
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        const effective: 'v1' | 'v3' = data.version === 'v3' ? 'v3' : 'v1';

        if (effective !== expectedVersion) {
          router.replace(effective === 'v3' ? '/dashboard-v3' : '/dashboard');
          return;
        }

        setIsChecking(false);
      } catch (err) {
        console.error('Error checking dashboard preference:', err);
        if (!cancelled) router.replace('/dashboard-entry');
      }
    }

    checkDashboardPreference();
    return () => {
      cancelled = true;
    };
  }, [router, expectedVersion]);

  if (isChecking) {
    return <LoadingAnimation fullScreen />;
  }

  return <>{children}</>;
}
