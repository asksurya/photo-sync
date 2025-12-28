// services/web/src/__tests__/hooks/useAssets.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssets } from '../../hooks/useAssets';
import { ApiClient } from '../../lib/apiClient';
import type { ReactNode } from 'react';

vi.mock('../../lib/apiClient');

describe('useAssets', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('should fetch assets successfully', async () => {
    const mockAssets = [
      { id: 'asset-1', path: '/photos/img1.jpg', type: 'IMAGE', createdAt: '2024-01-01' }
    ];

    vi.mocked(ApiClient.prototype.getAssets).mockResolvedValue(mockAssets);

    const { result } = renderHook(() => useAssets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ pages: [mockAssets], pageParams: [0] });
  });

  it('should handle empty assets array', async () => {
    vi.mocked(ApiClient.prototype.getAssets).mockResolvedValue([]);

    const { result } = renderHook(() => useAssets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ pages: [[]], pageParams: [0] });
  });

  it('should handle API errors', async () => {
    const errorMessage = 'Failed to fetch assets';
    vi.mocked(ApiClient.prototype.getAssets).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAssets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error(errorMessage));
  });

  it('should fetch next page when hasNextPage is true', async () => {
    const firstPageAssets = Array.from({ length: 100 }, (_, i) => ({
      id: `asset-${i}`,
      path: `/photos/img${i}.jpg`,
      type: 'IMAGE'
    }));

    const secondPageAssets = [
      { id: 'asset-100', path: '/photos/img100.jpg', type: 'IMAGE' }
    ];

    vi.mocked(ApiClient.prototype.getAssets)
      .mockResolvedValueOnce(firstPageAssets)
      .mockResolvedValueOnce(secondPageAssets);

    const { result } = renderHook(() => useAssets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(true);

    // Fetch next page
    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));

    expect(result.current.data).toEqual({
      pages: [firstPageAssets, secondPageAssets],
      pageParams: [0, 100]
    });
  });

  it('should not have next page when last page has fewer than 100 items', async () => {
    const mockAssets = [
      { id: 'asset-1', path: '/photos/img1.jpg', type: 'IMAGE' }
    ];

    vi.mocked(ApiClient.prototype.getAssets).mockResolvedValue(mockAssets);

    const { result } = renderHook(() => useAssets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it('should use correct pagination parameters', async () => {
    const mockAssets = [
      { id: 'asset-1', path: '/photos/img1.jpg', type: 'IMAGE' }
    ];

    vi.mocked(ApiClient.prototype.getAssets).mockResolvedValue(mockAssets);

    const { result } = renderHook(() => useAssets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(ApiClient.prototype.getAssets).toHaveBeenCalledWith(0, 100);
  });
});
