// services/web/src/hooks/useAssets.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { ApiClient, EnrichedAsset } from '../lib/apiClient';

// TEMPORARY: Mock data for screenshots
const USE_MOCK_DATA = true;

function getMockAssets(count: number): EnrichedAsset[] {
  const colors = ['ff6b6b', '4ecdc4', '45b7d1', 'f9ca24', '6c5ce7', 'a29bfe', 'fd79a8', 'fdcb6e'];
  const dates = ['2025-12-28', '2025-12-27', '2025-12-26', '2025-12-21', '2025-12-14', '2025-12-13'];

  return Array.from({ length: count }, (_, i) => {
    const color = colors[i % colors.length];
    const photoNum = i + 1;
    const svg = `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#${color}"/><text x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">Photo ${photoNum}</text></svg>`;
    const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;

    return {
      id: `mock-${i}`,
      type: 'IMAGE',
      path: dataUri,
      createdAt: dates[Math.floor(i / 4) % dates.length],
      fileCreatedAt: dates[Math.floor(i / 4) % dates.length],
      size: 1024 * 1024 * 2
    } as any;
  });
}

function getApiClient() {
  const token = localStorage.getItem('immich_token') || 'mock-token';
  return new ApiClient(
    import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000',
    token
  );
}

export function useAssets() {
  const apiClient = getApiClient();

  return useInfiniteQuery({
    queryKey: ['assets'],
    queryFn: async ({ pageParam = 0 }) => {
      if (USE_MOCK_DATA) {
        // Return mock data for screenshots
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
        return getMockAssets(24);
      }
      return apiClient.getAssets(pageParam, 100);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (USE_MOCK_DATA) return undefined; // No pagination for mock data
      return lastPage.length === 100 ? allPages.length * 100 : undefined;
    },
    initialPageParam: 0,
    staleTime: 30000,
    gcTime: 300000
  });
}
