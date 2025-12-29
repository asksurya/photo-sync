// services/web/src/__tests__/views/DuplicatesView.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DuplicatesView } from '../../views/DuplicatesView';
import * as useAssetsHook from '../../hooks/useAssets';

vi.mock('../../hooks/useAssets');

describe('DuplicatesView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should show loading state initially', () => {
    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });
    expect(screen.getByText(/loading duplicates/i)).toBeInTheDocument();
  });

  it('should show error state on error', () => {
    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to fetch'),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });
    expect(screen.getByText(/error loading duplicates/i)).toBeInTheDocument();
  });

  it('should show empty state when no duplicates found', () => {
    const assetsWithoutDuplicates = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', createdAt: '2024-01-01' },
      { id: '2', path: '/photo2.jpg', type: 'IMAGE', createdAt: '2024-01-02' }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [assetsWithoutDuplicates], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });
    expect(screen.getByText(/no duplicate groups found/i)).toBeInTheDocument();
  });

  it('should display duplicate groups when found', () => {
    const duplicateAssets = [
      {
        id: 'asset-1',
        path: '/photos/img1.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      },
      {
        id: 'asset-2',
        path: '/photos/img2.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      },
      {
        id: 'asset-3',
        path: '/photos/img3.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-2',
        similarityScore: 0.95
      },
      {
        id: 'asset-4',
        path: '/photos/img4.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-2',
        similarityScore: 0.95
      }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [duplicateAssets], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });

    // Should show "Duplicates" title
    expect(screen.getByText(/duplicates/i)).toBeInTheDocument();

    // Should render 4 images (2 groups x 2 images each)
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(4);
  });

  it('should group duplicates by duplicateGroupId', () => {
    const duplicateAssets = [
      {
        id: 'asset-1',
        path: '/photos/img1.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      },
      {
        id: 'asset-2',
        path: '/photos/img2.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [duplicateAssets], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    const { container } = render(<DuplicatesView />, { wrapper });

    // Should have 1 duplicate group card
    const duplicateCards = container.querySelectorAll('.bg-immich-card.rounded-lg');
    expect(duplicateCards.length).toBeGreaterThanOrEqual(1);
  });

  it('should filter out assets without duplicateGroupId', () => {
    const mixedAssets = [
      {
        id: 'asset-1',
        path: '/photos/img1.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      },
      {
        id: 'asset-2',
        path: '/photos/img2.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      },
      {
        id: 'asset-3',
        path: '/photos/img3.jpg',
        type: 'IMAGE'
        // No duplicateGroupId - should be filtered out
      }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [mixedAssets], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });

    // Should show "Duplicates" title
    expect(screen.getByText(/duplicates/i)).toBeInTheDocument();
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
  });

  it('should handle multiple pages of assets', () => {
    const page1 = [
      {
        id: 'asset-1',
        path: '/photos/img1.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      },
      {
        id: 'asset-2',
        path: '/photos/img2.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      }
    ];

    const page2 = [
      {
        id: 'asset-3',
        path: '/photos/img3.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-2',
        similarityScore: 0.95
      },
      {
        id: 'asset-4',
        path: '/photos/img4.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-2',
        similarityScore: 0.95
      }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [page1, page2], pageParams: [0, 100] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });

    // Should show "Duplicates" title
    expect(screen.getByText(/duplicates/i)).toBeInTheDocument();
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(4);
  });

  it('should show error message with error details', () => {
    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network timeout'),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });
    expect(screen.getByText(/error loading duplicates: network timeout/i)).toBeInTheDocument();
  });

  it('should show generic error when error has no message', () => {
    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });
    expect(screen.getByText(/error loading duplicates: unknown error/i)).toBeInTheDocument();
  });

  it('should handle undefined data gracefully', () => {
    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });
    expect(screen.getByText(/no duplicate groups found/i)).toBeInTheDocument();
  });

  it('should handle empty pages gracefully', () => {
    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [[]], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });
    expect(screen.getByText(/no duplicate groups found/i)).toBeInTheDocument();
  });

  it('should display title when duplicate groups are found', () => {
    const duplicateAssets = [
      {
        id: 'asset-1',
        path: '/photos/img1.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      },
      {
        id: 'asset-2',
        path: '/photos/img2.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [duplicateAssets], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<DuplicatesView />, { wrapper });
    expect(screen.getByText(/duplicates/i)).toBeInTheDocument();
  });
});
