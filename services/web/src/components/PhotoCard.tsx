// services/web/src/components/PhotoCard.tsx
import { EnrichedAsset } from '../lib/apiClient';
import { MdFolder, MdWarning } from 'react-icons/md';

export interface PhotoCardProps {
  asset: EnrichedAsset;
  onClick?: (asset: EnrichedAsset) => void;
}

export function PhotoCard({ asset, onClick }: PhotoCardProps) {
  const hasGroup = !!asset.groupId;
  const hasDuplicate = !!asset.duplicateGroupId;
  const versionCount = hasGroup ? (asset.alternateVersions?.length || 0) + 1 : 1;

  // Extract filename from path for alt text (check both originalPath and path)
  const filePath = asset.originalPath || asset.path;
  const filename = filePath?.split('/').pop() || 'Photo';

  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-xl bg-immich-card cursor-pointer
                 transition-all duration-300 hover:shadow-soft-lg hover:scale-[1.02]
                 border border-transparent hover:border-immich-border-hover"
      onClick={() => onClick?.(asset)}
    >
      {/* Image with subtle zoom on hover */}
      <img
        src={`/api/immich/assets/${asset.id}/thumbnail`}
        alt={filename}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Version badge */}
      {hasGroup && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5
                      bg-black/80 backdrop-blur-md rounded-lg border border-white/10
                      shadow-soft text-white
                      transform transition-all duration-300
                      group-hover:scale-110 group-hover:shadow-glow-sm">
          <MdFolder className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{versionCount} versions</span>
        </div>
      )}

      {/* Duplicate warning badge */}
      {hasDuplicate && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5
                      bg-amber-500/90 backdrop-blur-md rounded-lg border border-amber-400/30
                      shadow-soft text-white
                      transform transition-all duration-300
                      group-hover:scale-110 group-hover:shadow-glow-sm">
          <MdWarning className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Similar</span>
        </div>
      )}

      {/* Filename on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-4
                    transform translate-y-full group-hover:translate-y-0
                    transition-transform duration-300">
        <p className="text-xs text-white font-medium truncate drop-shadow-lg">
          {filename}
        </p>
      </div>

      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent
                    -translate-x-full group-hover:translate-x-full
                    transition-transform duration-1000 pointer-events-none" />
    </div>
  );
}
