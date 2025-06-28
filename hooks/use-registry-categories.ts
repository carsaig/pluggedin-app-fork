import useSWR from 'swr';

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL || 'http://localhost:3001';

export function useRegistryCategories() {
  const { data, error, isLoading } = useSWR<string[]>(
    'registry-categories',
    async () => {
      const response = await fetch(`${REGISTRY_URL}/categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return await response.json() as string[];
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Categories don't change often
    }
  );

  return {
    categories: data || [],
    error,
    isLoading,
  };
}