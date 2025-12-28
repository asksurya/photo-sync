// services/web/src/components/PhotoCard.tsx
import { EnrichedAsset } from '../lib/apiClient';

export interface PhotoCardProps {
  asset: EnrichedAsset;
}

export function PhotoCard({ asset }: PhotoCardProps) {
  const hasGroup = !!asset.groupId;
  const hasDuplicate = !!asset.duplicateGroupId;
  const versionCount = hasGroup ? (asset.alternateVersions?.length || 0) + 1 : 1;

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
      <img
        src={`/api/immich/assets/${asset.id}/thumbnail`}
        alt={asset.path}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {hasGroup && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
          📁 {versionCount} versions
        </div>
      )}

      {hasDuplicate && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/90 text-white text-xs rounded">
          ⚠️ Similar
        </div>
      )}
    </div>
  );
}
