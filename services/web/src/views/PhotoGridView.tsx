// services/web/src/views/PhotoGridView.tsx
import React, { useEffect } from 'react';
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading photos...</div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">No photos to display</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PhotoTimeline assets={allAssets} />

      {/* Infinite scroll sentinel */}
      {hasNextPage && (
        <div ref={ref} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="text-gray-600">Loading more photos...</div>
          ) : (
            <div className="text-gray-400">Scroll for more</div>
          )}
        </div>
      )}
    </div>
  );
}
