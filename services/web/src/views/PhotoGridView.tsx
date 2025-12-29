// services/web/src/views/PhotoGridView.tsx
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useAssets } from '../hooks/useAssets';
import { PhotoTimeline } from '../components/PhotoTimeline';
import { EnrichedAsset } from '../lib/apiClient';

export function PhotoGridView() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useAssets();

  const { ref, inView } = useInView({
    threshold: 0,
  });

  // Fetch next page when sentinel comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-immich-text-muted">Loading photos...</div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-immich-error">
          Error loading photos: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  // Flatten all pages into single array
  const allAssets: EnrichedAsset[] = data?.pages.flat() || [];

  // Empty state
  if (allAssets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-24 h-24 text-immich-text-muted mb-4">
          {/* Empty state icon */}
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </div>
        <p className="text-immich-text-muted text-sm">No photos to display</p>
        <p className="text-immich-text-muted text-xs mt-2">Upload photos to your Immich library to get started</p>
      </div>
    );
  }

  return (
    <div>
      <PhotoTimeline assets={allAssets} />

      {/* Infinite scroll sentinel */}
      {hasNextPage && (
        <div ref={ref} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="text-immich-text-muted">Loading more photos...</div>
          ) : (
            <div className="text-immich-text-muted text-sm">Scroll for more</div>
          )}
        </div>
      )}
    </div>
  );
}
