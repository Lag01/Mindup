'use client';

import dynamic from 'next/dynamic';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useDashboardVersion } from '@/hooks/useDashboardVersion';

const PublicDecksV1 = dynamic(() => import('@/components/PublicDecks/PublicDecksV1'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

const PublicDecksV2 = dynamic(() => import('@/components/PublicDecks/PublicDecksV2'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

export default function PublicDecksPage() {
  const { version, loading } = useDashboardVersion();

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return version === 'v1' ? <PublicDecksV1 /> : <PublicDecksV2 />;
}
