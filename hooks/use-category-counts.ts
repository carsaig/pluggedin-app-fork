'use client';

import useSWR from 'swr';

const REGISTRY_URL = process.env.NEXT_PUBLIC_PLUGGEDIN_REGISTRY_URL || 'http://localhost:3001';

export function useCategoryCounts() {
  const { data, error, isLoading } = useSWR<Record<string, number>>(
    `${REGISTRY_URL}/categories/counts`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch category counts');
      }
      return res.json();
    }
  );

  return {
    counts: data || {},
    isLoading,
    error
  };
}