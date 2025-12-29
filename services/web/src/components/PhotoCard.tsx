// services/web/src/components/PhotoCard.tsx
import { EnrichedAsset } from '../lib/apiClient';
import { MdFolder, MdWarning } from 'react-icons/md';

export interface PhotoCardProps {
  asset: EnrichedAsset;
}

export function PhotoCard({ asset }: PhotoCardProps) {
  const hasGroup = !!asset.groupId;
  const hasDuplicate = !!asset.duplicateGroupId;
  const versionCount = hasGroup ? (asset.alternateVersions?.length || 0) + 1 : 1;

  return (
    <div className="group relative aspect-square overflow-hidden rounded-[6px] bg-immich-card cursor-pointer transition-transform duration-150 hover:scale-102">
      <img
        src={`/api/immich/assets/${asset.id}/thumbnail`}
        alt="Photo"
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {hasGroup && (
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white backdrop-blur-sm">
          <MdFolder className="w-3 h-3" />
          <span>{versionCount} versions</span>
        </div>
      )}

      {hasDuplicate && (
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-immich-warning/90 px-2 py-1 text-xs text-white backdrop-blur-sm">
          <MdWarning className="w-3 h-3" />
          <span>Similar</span>
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 transition-colors duration-150 group-hover:bg-black/10" />
    </div>
  );
}
