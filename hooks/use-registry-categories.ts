import { McpServerCategory } from '@/types/search';
import useSWR from 'swr';

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL || 'http://localhost:3001';

export function useRegistryCategories() {
  const { data, error, isLoading } = useSWR(
    'registry-categories',
    async () => {
      const response = await fetch(`${REGISTRY_URL}/categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const categories = await response.json() as string[];
      // Map string categories to enum values
      return categories.map(cat => {
        // Convert category string to enum key format
        const enumKey = cat.toUpperCase().replace(/\s+/g, '_');
        return McpServerCategory[enumKey as keyof typeof McpServerCategory] || cat;
      }).filter(Boolean) as McpServerCategory[];
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