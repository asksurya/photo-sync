// services/web/src/components/VersionSwitcherModal.tsx
import * as Dialog from '@radix-ui/react-dialog';
import { MdClose, MdCheckCircle, MdFolder } from 'react-icons/md';
import { EnrichedAsset } from '../lib/apiClient';

export interface VersionSwitcherModalProps {
  asset: EnrichedAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionSwitcherModal({ asset, open, onOpenChange }: VersionSwitcherModalProps) {
  // Calculate all version IDs (main + alternates)
  const allVersionIds = [asset.id, ...(asset.alternateVersions || [])];
  const versionCount = allVersionIds.length;

  // Extract filename for display (check both path and originalPath)
  const filePath = asset.originalPath || asset.path;
  const filename = filePath?.split('/').pop() || 'Photo';

  // Extract file extension from primary asset (check both path and originalPath)
  const primaryExtension = filePath?.split('.').pop()?.toUpperCase() || 'FILE';

  // Build array of all extensions (primary + alternates)
  const allExtensions = [primaryExtension, ...(asset.alternateVersionExtensions || [])];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay with backdrop blur */}
        <Dialog.Overlay className="fixed inset-0 bg-immich-overlay backdrop-blur-sm
                                   data-[state=open]:animate-fade-in
                                   data-[state=closed]:animate-fade-in z-50" />

        {/* Modal Content */}
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   bg-immich-card rounded-2xl border border-immich-border
                   w-[90vw] max-w-4xl max-h-[85vh] overflow-hidden
                   shadow-soft-lg
                   data-[state=open]:animate-scale-in
                   data-[state=closed]:animate-fade-in
                   flex flex-col z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-immich-border bg-gradient-to-br from-immich-card to-immich-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-immich-accent to-purple-600 rounded-xl
                            flex items-center justify-center shadow-soft">
                <MdFolder className="w-5 h-5 text-white" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-immich-text flex items-center gap-2">
                  {versionCount} {versionCount === 1 ? 'Version' : 'Versions'}
                </Dialog.Title>
                <p className="text-xs text-immich-text-muted truncate max-w-md">
                  {filename}
                </p>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                className="w-9 h-9 flex items-center justify-center rounded-xl
                         bg-immich-hover hover:bg-immich-input border border-immich-border
                         text-immich-text-secondary hover:text-immich-text
                         transition-all duration-250 group"
                aria-label="Close"
              >
                <MdClose className="w-5 h-5 group-hover:rotate-90 transition-transform duration-250" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="sr-only">
            View and compare all versions of this photo
          </Dialog.Description>

          {/* Versions Grid - Scrollable */}
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allVersionIds.map((versionId, index) => (
                <div
                  key={versionId}
                  className="group relative aspect-square overflow-hidden rounded-xl
                           bg-immich-hover border border-immich-border
                           hover:border-immich-border-hover hover:shadow-soft
                           transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <img
                    src={`/api/immich/assets/${versionId}/thumbnail`}
                    alt={`${allExtensions[index] || 'FILE'} version`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Primary badge */}
                  {index === 0 && asset.isPrimaryVersion && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5
                                  bg-immich-accent/90 backdrop-blur-md rounded-lg border border-immich-accent/30
                                  shadow-soft text-white
                                  transform transition-all duration-300
                                  group-hover:scale-110 group-hover:shadow-glow-sm">
                      <MdCheckCircle className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Primary</span>
                    </div>
                  )}

                  {/* File extension on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-3
                                transform translate-y-full group-hover:translate-y-0
                                transition-transform duration-300">
                    <p className="text-xs text-white font-medium drop-shadow-lg">
                      {allExtensions[index] || 'FILE'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-immich-border bg-gradient-to-br from-immich-card to-immich-hover
                        flex items-center justify-between">
            <p className="text-sm text-immich-text-muted">
              Hover over images to preview
            </p>

            <Dialog.Close asChild>
              <button
                className="px-5 py-2.5 bg-immich-accent hover:bg-immich-accent-hover text-white
                         rounded-xl font-medium text-sm
                         transition-all duration-250 shadow-soft hover:shadow-glow-sm"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
