// services/web/src/__tests__/views/PhotoGridView.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PhotoGridView } from '../../views/PhotoGridView';
import * as useAssetsHook from '../../hooks/useAssets';

vi.mock('../../hooks/useAssets');
vi.mock('react-intersection-observer', () => ({
  useInView: vi.fn()
}));

import { useInView } from 'react-intersection-observer';

describe('PhotoGridView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.mocked(useInView).mockReturnValue({
      ref: vi.fn() as any,
      inView: false,
      entry: undefined
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

    render(<PhotoGridView />, { wrapper });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
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

    render(<PhotoGridView />, { wrapper });
    expect(screen.getByText(/error loading photos/i)).toBeInTheDocument();
  });

  it('should show empty state when no photos', () => {
    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [[]], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<PhotoGridView />, { wrapper });
    expect(screen.getByText(/no photos/i)).toBeInTheDocument();
  });

  it('should render PhotoTimeline with assets', () => {
    const mockAssets = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [mockAssets], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    const { container } = render(<PhotoGridView />, { wrapper });
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(1);
  });

  it('should show "Scroll for more" when hasNextPage is true and not fetching', () => {
    const mockAssets = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [mockAssets], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false
    } as any);

    render(<PhotoGridView />, { wrapper });
    expect(screen.getByText(/scroll for more/i)).toBeInTheDocument();
  });

  it('should show loading indicator when fetching next page', () => {
    const mockAssets = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [mockAssets], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: true
    } as any);

    render(<PhotoGridView />, { wrapper });
    expect(screen.getByText(/loading more photos/i)).toBeInTheDocument();
  });

  it('should not show sentinel when no more pages', () => {
    const mockAssets = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() }
    ];

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [mockAssets], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<PhotoGridView />, { wrapper });
    expect(screen.queryByText(/scroll for more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/loading more photos/i)).not.toBeInTheDocument();
  });

  it('should call fetchNextPage when sentinel comes into view', async () => {
    const mockAssets = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() }
    ];
    const fetchNextPage = vi.fn();

    vi.mocked(useInView).mockReturnValue({
      ref: vi.fn() as any,
      inView: true,
      entry: undefined
    });

    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: { pages: [mockAssets], pageParams: [0] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false
    } as any);

    render(<PhotoGridView />, { wrapper });

    await waitFor(() => {
      expect(fetchNextPage).toHaveBeenCalled();
    });
  });

  it('should flatten multiple pages of assets', () => {
    const page1 = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() }
    ];
    const page2 = [
      { id: '2', path: '/photo2.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() }
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

    const { container } = render(<PhotoGridView />, { wrapper });
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(2);
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

    render(<PhotoGridView />, { wrapper });
    expect(screen.getByText(/error loading photos: network timeout/i)).toBeInTheDocument();
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

    render(<PhotoGridView />, { wrapper });
    expect(screen.getByText(/error loading photos: unknown error/i)).toBeInTheDocument();
  });

  it('should handle undefined data.pages gracefully', () => {
    vi.mocked(useAssetsHook.useAssets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    } as any);

    render(<PhotoGridView />, { wrapper });
    expect(screen.getByText(/no photos/i)).toBeInTheDocument();
  });
});
