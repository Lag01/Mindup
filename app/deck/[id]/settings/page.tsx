'use client';

import dynamic from 'next/dynamic';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useDashboardVersion } from '@/hooks/useDashboardVersion';

const DeckSettingsV1 = dynamic(() => import('@/components/DeckSettings/DeckSettingsV1'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

const DeckSettingsV2 = dynamic(() => import('@/components/DeckSettings/DeckSettingsV2'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

export default function DeckSettingsPage() {
  const { version, loading } = useDashboardVersion();

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return version === 'v1' ? <DeckSettingsV1 /> : <DeckSettingsV2 />;
}
