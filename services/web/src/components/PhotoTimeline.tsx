// services/web/src/components/PhotoTimeline.tsx
import React from 'react';
import { EnrichedAsset } from '../lib/apiClient';
import { PhotoCard } from './PhotoCard';

export interface PhotoTimelineProps {
  assets: EnrichedAsset[];
}

interface GroupedAssets {
  [date: string]: EnrichedAsset[];
}

function formatDateLabel(dateStr: string): string {
  // dateStr is in YYYY-MM-DD format
  const [year, month, day] = dateStr.split('-').map(Number);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === todayKey) {
    return 'Today';
  } else if (dateStr === yesterdayKey) {
    return 'Yesterday';
  } else {
    // Create date in local timezone for display
    const displayDate = new Date(year, month - 1, day);
    return displayDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

function groupAssetsByDate(assets: EnrichedAsset[]): GroupedAssets {
  const groups: GroupedAssets = {};

  assets.forEach(asset => {
    if (!asset.createdAt) return;

    const date = new Date(asset.createdAt);
    // Create date key in local timezone
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(asset);
  });

  return groups;
}

export function PhotoTimeline({ assets }: PhotoTimelineProps) {
  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No photos to display
      </div>
    );
  }

  const groupedAssets = groupAssetsByDate(assets);
  const sortedDates = Object.keys(groupedAssets).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-8">
      {sortedDates.map(dateKey => (
        <div key={dateKey}>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            {formatDateLabel(dateKey)}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {groupedAssets[dateKey].map(asset => (
              <PhotoCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
