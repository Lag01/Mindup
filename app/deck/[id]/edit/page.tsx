'use client';

import dynamic from 'next/dynamic';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useDashboardVersion } from '@/hooks/useDashboardVersion';

const EditDeckV1 = dynamic(() => import('@/components/EditDeck/EditDeckV1'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

const EditDeckV2 = dynamic(() => import('@/components/EditDeck/EditDeckV2'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

export default function EditDeckPage() {
  const { version, loading } = useDashboardVersion();

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return version === 'v1' ? <EditDeckV1 /> : <EditDeckV2 />;
}
