'use client';

import dynamic from 'next/dynamic';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useDashboardVersion } from '@/hooks/useDashboardVersion';

const AddCardsV1 = dynamic(() => import('@/components/AddCards/AddCardsV1'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

const AddCardsV2 = dynamic(() => import('@/components/AddCards/AddCardsV2'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

export default function AddCardsPage() {
  const { version, loading } = useDashboardVersion();

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return version === 'v1' ? <AddCardsV1 /> : <AddCardsV2 />;
}
