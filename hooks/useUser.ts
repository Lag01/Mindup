'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();

        if (mounted) {
          setUser(data.user);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading, error, isAdmin: user?.isAdmin || false };
}
