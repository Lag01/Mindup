'use client';

import dynamic from 'next/dynamic';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useDashboardVersion } from '@/hooks/useDashboardVersion';

const ImportV1 = dynamic(() => import('@/components/Import/ImportV1'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

const ImportV2 = dynamic(() => import('@/components/Import/ImportV2'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

export default function ImportPage() {
  const { version, loading } = useDashboardVersion();

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return version === 'v1' ? <ImportV1 /> : <ImportV2 />;
}
