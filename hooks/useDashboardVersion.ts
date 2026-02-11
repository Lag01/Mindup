'use client';

import { useEffect, useState } from 'react';

export function useDashboardVersion(): { version: string | null; loading: boolean } {
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('/api/user/dashboard-preference');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard version');
        }
        const data = await response.json();
        setVersion(data.dashboardVersion);
      } catch (error) {
        console.error('Error fetching dashboard version:', error);
        setVersion('v2');
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();
  }, []);

  return { version, loading };
}
