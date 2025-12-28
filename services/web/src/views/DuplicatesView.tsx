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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading duplicates...</div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">
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
    const groupId = asset.duplicateGroupId!;
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">No duplicate groups found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {groupCount} duplicate {groupCount === 1 ? 'group' : 'groups'} found
      </h1>

      <div className="space-y-6">
        {duplicateGroupEntries.map(([groupId, group]) => (
          <DuplicateGroupCard key={groupId} duplicates={group} />
        ))}
      </div>
    </div>
  );
}
