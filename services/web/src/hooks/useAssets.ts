// services/web/src/hooks/useAssets.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { ApiClient } from '../lib/apiClient';

const apiClient = new ApiClient(
  import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000',
  'mock-token' // TODO: Get from auth context
);

export function useAssets() {
  return useInfiniteQuery({
    queryKey: ['assets'],
    queryFn: ({ pageParam = 0 }) => apiClient.getAssets(pageParam, 100),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 100 ? allPages.length * 100 : undefined;
    },
    initialPageParam: 0,
    staleTime: 30000,
    gcTime: 300000
  });
}
