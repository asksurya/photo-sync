// services/web/src/components/DuplicateGroupCard.tsx
import { EnrichedAsset } from '../lib/apiClient';

export interface DuplicateGroupCardProps {
  duplicates: EnrichedAsset[];
}

export function DuplicateGroupCard({ duplicates }: DuplicateGroupCardProps) {
  // Guard against empty array
  if (duplicates.length === 0) {
    return null;
  }

  // Get similarity score from first asset (should be same across all in group)
  const similarityScore = duplicates[0].similarityScore;
  const duplicateType = duplicates[0].duplicateType;

  // Extract filename from path for alt text
  const getFilename = (path: string | undefined, id: string) => {
    if (!path) return id;
    return path.split('/').pop() || id;
  };

  return (
    <div className="bg-immich-card border border-immich-border rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-immich-text">
            Duplicate Group
          </h3>
          <p className="text-sm text-immich-text-muted">
            {duplicates.length} {duplicates.length === 1 ? 'photo' : 'photos'}
          </p>
        </div>
        {duplicateType && (
          <span className="px-3 py-1 bg-immich-hover text-immich-text-secondary text-xs rounded-full">
            {duplicateType}
          </span>
        )}
      </div>

      {similarityScore !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-immich-text-secondary">Similarity</span>
            <span className="text-sm text-immich-text font-medium">
              {Math.round(similarityScore * 100)}%
            </span>
          </div>
          <div className="w-full bg-immich-hover rounded-full h-2 overflow-hidden">
            <div
              className="bg-immich-accent h-full transition-all duration-300"
              style={{ width: `${Math.round(similarityScore * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {duplicates.map((asset) => (
          <div key={asset.id} className="group relative">
            <div className="relative overflow-hidden rounded-lg bg-immich-hover">
              <img
                src={`/api/immich/assets/${asset.id}/thumbnail`}
                alt={getFilename(asset.path, asset.id)}
                className="w-full aspect-square object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
              {asset.isPrimaryVersion && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded">
                  Primary
                </div>
              )}
            </div>
            {asset.path && (
              <div className="mt-1 text-xs text-immich-text-muted truncate">
                {asset.path.split('/').pop()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
