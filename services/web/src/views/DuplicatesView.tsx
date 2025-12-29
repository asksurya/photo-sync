// services/web/src/views/DuplicatesView.tsx
import { useAssets } from '../hooks/useAssets';
import { DuplicateGroupCard } from '../components/DuplicateGroupCard';
import { EnrichedAsset } from '../lib/apiClient';

export function DuplicatesView() {
  const {
    data,
    isLoading,
    isError,
    error
  } = useAssets();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-immich-text-muted">Loading duplicates...</div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-immich-error">
          Error loading duplicates: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  // Flatten all pages into single array
  const allAssets: EnrichedAsset[] = data?.pages.flat() || [];

  // Filter assets to only those with duplicateGroupId
  const duplicateAssets = allAssets.filter(asset => asset.duplicateGroupId);

  // Group duplicates by duplicateGroupId
  const groupedDuplicates = duplicateAssets.reduce((acc, asset) => {
    const groupId = asset.duplicateGroupId;
    // Skip if groupId is null/undefined (should not happen due to filter above)
    if (!groupId) return acc;

    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(asset);
    return acc;
  }, {} as Record<string, EnrichedAsset[]>);

  // Convert to array of groups with their IDs
  const duplicateGroupEntries = Object.entries(groupedDuplicates);
  const groupCount = duplicateGroupEntries.length;

  // Empty state
  if (groupCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <svg
          className="w-24 h-24 text-immich-text-muted mb-4"
          aria-hidden="true"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <div className="text-immich-text-muted text-sm">No duplicate groups found</div>
        <div className="text-immich-text-muted text-xs mt-2">Your library is clean!</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-immich-text mb-6">Duplicates</h1>

      <div className="space-y-6">
        {duplicateGroupEntries.map(([groupId, group]) => (
          <DuplicateGroupCard key={groupId} duplicates={group} />
        ))}
      </div>
    </div>
  );
}
