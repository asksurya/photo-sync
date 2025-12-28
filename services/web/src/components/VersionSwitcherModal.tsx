// services/web/src/components/VersionSwitcherModal.tsx
import * as Dialog from '@radix-ui/react-dialog';
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-[90vw] max-w-3xl max-h-[85vh] overflow-auto">
          <Dialog.Title className="text-xl font-semibold mb-4">
            {versionCount} {versionCount === 1 ? 'version' : 'versions'}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            View and compare all versions of this photo
          </Dialog.Description>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {allVersionIds.map((versionId, index) => (
              <div key={versionId} className="relative">
                <img
                  src={`/api/immich/assets/${versionId}/thumbnail`}
                  alt={`Version ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg"
                />
                {index === 0 && asset.isPrimaryVersion && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                    Primary
                  </div>
                )}
              </div>
            ))}
          </div>

          <Dialog.Close asChild>
            <button
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
              aria-label="Close"
            >
              Close
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
