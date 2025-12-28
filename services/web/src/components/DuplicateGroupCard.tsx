// services/web/src/components/DuplicateGroupCard.tsx
import { EnrichedAsset } from '../lib/apiClient';

export interface DuplicateGroupCardProps {
  duplicates: EnrichedAsset[];
}

export function DuplicateGroupCard({ duplicates }: DuplicateGroupCardProps) {
  // Get similarity score from first asset (should be same across all in group)
  const similarityScore = duplicates[0]?.similarityScore;
  const duplicateType = duplicates[0]?.duplicateType;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          Duplicate Group ({duplicates.length} photos)
        </h3>
        <div className="flex gap-2 text-xs text-gray-600">
          {duplicateType && (
            <span className="px-2 py-1 bg-gray-100 rounded">
              {duplicateType}
            </span>
          )}
          {similarityScore !== undefined && (
            <span className="px-2 py-1 bg-yellow-100 rounded">
              {Math.round(similarityScore * 100)}% similar
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
        {duplicates.map((asset) => (
          <div key={asset.id} className="relative">
            <img
              src={`/api/immich/assets/${asset.id}/thumbnail`}
              alt={asset.path || asset.id}
              className="w-full aspect-square object-cover rounded"
            />
            {asset.isPrimaryVersion && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                Primary
              </div>
            )}
            {asset.path && (
              <div className="mt-1 text-xs text-gray-600 truncate">
                {asset.path.split('/').pop()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
