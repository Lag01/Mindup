'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingAnimation from './LoadingAnimation';
import { useToast } from '@/hooks/useToast';

export default function DashboardRedirector() {
  const router = useRouter();
  const { error, ToastContainer } = useToast();

  useEffect(() => {
    let cancelled = false;

    const redirect = async () => {
      try {
        const response = await fetch('/api/user/dashboard-preference');
        if (!response.ok) throw new Error('Erreur de chargement');

        const data = await response.json();
        if (cancelled) return;

        const targetPath = data.version === 'v3' ? '/dashboard-v3' : '/dashboard';
        router.replace(targetPath);
      } catch (err) {
        console.error('Error fetching dashboard preference:', err);
        if (!cancelled) error('Erreur lors du chargement du dashboard');
      }
    };

    redirect();
    return () => {
      cancelled = true;
    };
  }, [router, error]);

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingAnimation />
      </div>
      <ToastContainer />
    </>
  );
}
