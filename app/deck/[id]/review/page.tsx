'use client';

import dynamic from 'next/dynamic';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useDashboardVersion } from '@/hooks/useDashboardVersion';

const ReviewV1 = dynamic(() => import('@/components/Review/ReviewV1'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

const ReviewV2 = dynamic(() => import('@/components/Review/ReviewV2'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

export default function ReviewPage() {
  const { version, loading } = useDashboardVersion();

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return version === 'v1' ? <ReviewV1 /> : <ReviewV2 />;
}
