'use client';

import dynamic from 'next/dynamic';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useDashboardVersion } from '@/hooks/useDashboardVersion';

const LeaderboardV1 = dynamic(() => import('@/components/Leaderboard/LeaderboardV1'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

const LeaderboardV2 = dynamic(() => import('@/components/Leaderboard/LeaderboardV2'), {
  loading: () => <LoadingAnimation fullScreen />,
  ssr: false,
});

export default function LeaderboardPage() {
  const { version, loading } = useDashboardVersion();

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return version === 'v1' ? <LeaderboardV1 /> : <LeaderboardV2 />;
}
