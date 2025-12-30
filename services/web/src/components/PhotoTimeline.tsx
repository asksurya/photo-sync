// services/web/src/components/PhotoTimeline.tsx
import React, { useState } from 'react';
import { ApiClient, EnrichedAsset } from '../lib/apiClient';
import { PhotoCard } from './PhotoCard';
import { VersionSwitcherModal } from './VersionSwitcherModal';

export interface PhotoTimelineProps {
  assets: EnrichedAsset[];
}

function getApiClient() {
  const token = localStorage.getItem('immich_token') || 'mock-token';
  return new ApiClient(
    import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000',
    token
  );
}

export function PhotoTimeline({ assets }: PhotoTimelineProps) {
  const [selectedAsset, setSelectedAsset] = useState<EnrichedAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePhotoClick = (asset: EnrichedAsset) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleDelete = async (assetIds: string[]) => {
    const apiClient = getApiClient();
    await apiClient.deleteAssets(assetIds);
  };

  const { groupedAssets, sortedDates } = React.useMemo(() => {
    const groups: Record<string, EnrichedAsset[]> = {};

    assets.forEach((asset) => {
      if (!asset.fileCreatedAt) return;

      const date = new Date(asset.fileCreatedAt);
      const dateKey = date.toLocaleDateString(navigator.language || 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(asset);
    });

    const sorted = Object.keys(groups).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    return { groupedAssets: groups, sortedDates: sorted };
  }, [assets]);

  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-immich-text-muted text-sm">
        No photos to display
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {sortedDates.map(dateKey => (
          <div key={dateKey}>
            <h2 className={`text-base font-semibold text-immich-text mb-3 sticky top-0 bg-immich-bg/95 backdrop-blur-sm py-2 ${isModalOpen ? 'hidden' : ''}`}>
              {dateKey}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {groupedAssets[dateKey].map(asset => (
                <PhotoCard key={asset.id} asset={asset} onClick={handlePhotoClick} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedAsset && (
        <VersionSwitcherModal
          asset={selectedAsset}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
