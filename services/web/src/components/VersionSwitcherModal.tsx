// services/web/src/components/VersionSwitcherModal.tsx
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { MdClose, MdCheckCircle, MdDelete, MdCheck, MdChevronLeft, MdChevronRight, MdWarning } from 'react-icons/md';
import { EnrichedAsset } from '../lib/apiClient';

export interface VersionSwitcherModalProps {
  asset: EnrichedAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (assetIds: string[]) => Promise<void>;
}

export function VersionSwitcherModal({ asset, open, onOpenChange, onDelete }: VersionSwitcherModalProps) {
  // Calculate all version IDs (main + alternates)
  const allVersionIds = [asset.id, ...(asset.alternateVersions || [])];
  const versionCount = allVersionIds.length;

  // Extract file extension from primary asset (check both path and originalPath)
  const filePath = asset.originalPath || asset.path;
  const primaryExtension = filePath?.split('.').pop()?.toUpperCase() || 'FILE';

  // Build array of all extensions (primary + alternates)
  const allExtensions = [primaryExtension, ...(asset.alternateVersionExtensions || [])];

  // State for current viewing version and marked for deletion
  const [currentIndex, setCurrentIndex] = useState(0);
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Navigation handlers
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allVersionIds.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < allVersionIds.length - 1 ? prev + 1 : 0));
  };

  // Toggle deletion mark
  const toggleDeletion = (index: number) => {
    setMarkedForDeletion((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Keep current version (mark others for deletion)
  const keepOnlyThis = (index: number) => {
    const newSet = new Set<number>();
    allVersionIds.forEach((_, i) => {
      if (i !== index) {
        newSet.add(i);
      }
    });
    setMarkedForDeletion(newSet);
  };

  // Handle apply deletions
  const handleApplyDeletions = async () => {
    if (!onDelete) {
      console.warn('No onDelete handler provided');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const idsToDelete = Array.from(markedForDeletion).map(i => allVersionIds[i]);
      console.log('Deleting versions:', idsToDelete);
      await onDelete(idsToDelete);

      // Close modal on success and reload page to refresh the list
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete assets:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete assets');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentVersionId = allVersionIds[currentIndex];
  const isCurrentMarkedForDeletion = markedForDeletion.has(currentIndex);
  const deletionCount = markedForDeletion.size;

  // Determine which endpoint to use based on file extension
  // For web-compatible formats (JPG, PNG, WEBP, GIF), use original for full resolution
  // For RAW formats (CR2, NEF, ARW, DNG, etc.), use preview size (1440p converted JPEG)
  // Note: Immich does not provide full-resolution converted images for RAW files
  const currentExtension = allExtensions[currentIndex];
  const webCompatibleFormats = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP'];
  const useOriginal = webCompatibleFormats.includes(currentExtension);
  const imageEndpoint = useOriginal ? 'original' : 'thumbnail?size=preview';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Full screen overlay */}
        <Dialog.Overlay className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50" />

        {/* Full screen modal */}
        <Dialog.Content className="fixed inset-0 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 border-b border-white/10">
            <div className="flex items-center gap-4">
              <Dialog.Title className="text-lg font-semibold text-white flex items-center gap-2">
                Version Manager
              </Dialog.Title>
              <p className="text-sm text-white/60">
                {currentIndex + 1} of {versionCount} • {allExtensions[currentIndex]}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {deleteError && (
                <div className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm border border-red-600/30">
                  {deleteError}
                </div>
              )}
              {deletionCount > 0 && (
                <button
                  onClick={handleApplyDeletions}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm
                           transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MdDelete className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : `Delete ${deletionCount} ${deletionCount === 1 ? 'Version' : 'Versions'}`}
                </button>
              )}
              <Dialog.Close asChild>
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-lg
                           bg-white/10 hover:bg-white/20 text-white
                           transition-all duration-200"
                  aria-label="Close"
                >
                  <MdClose className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <Dialog.Description className="sr-only">
            Manage and delete photo versions
          </Dialog.Description>

          {/* Main Image Viewer */}
          <div className="flex-1 flex items-center justify-center p-4 relative">
            {/* Navigation arrows */}
            {versionCount > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12
                           bg-black/50 hover:bg-black/70 rounded-full
                           flex items-center justify-center text-white
                           transition-all duration-200 z-10"
                >
                  <MdChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12
                           bg-black/50 hover:bg-black/70 rounded-full
                           flex items-center justify-center text-white
                           transition-all duration-200 z-10"
                >
                  <MdChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {/* Full size image */}
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              <img
                src={`/api/immich/assets/${currentVersionId}/${imageEndpoint}`}
                alt={`${allExtensions[currentIndex]} version`}
                className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded-lg shadow-2xl"
              />

              {/* Deletion overlay */}
              {isCurrentMarkedForDeletion && (
                <div className="absolute inset-0 bg-red-600/30 backdrop-blur-sm rounded-lg
                              flex items-center justify-center">
                  <div className="bg-red-600 px-6 py-3 rounded-lg flex items-center gap-3 shadow-xl">
                    <MdWarning className="w-6 h-6 text-white" />
                    <span className="text-white font-semibold">Marked for Deletion</span>
                  </div>
                </div>
              )}

              {/* Primary version badge */}
              {currentIndex === 0 && asset.isPrimaryVersion && !isCurrentMarkedForDeletion && (
                <div className="absolute top-4 left-4 px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2 shadow-lg">
                  <MdCheckCircle className="w-5 h-5 text-white" />
                  <span className="text-sm text-white font-medium">Primary Version</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-black/50 border-t border-white/10">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDeletion(currentIndex)}
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2
                           transition-all duration-200 ${
                             isCurrentMarkedForDeletion
                               ? 'bg-green-600 hover:bg-green-700 text-white'
                               : 'bg-red-600 hover:bg-red-700 text-white'
                           }`}
                >
                  {isCurrentMarkedForDeletion ? (
                    <>
                      <MdCheck className="w-5 h-5" />
                      Keep This
                    </>
                  ) : (
                    <>
                      <MdDelete className="w-5 h-5" />
                      Mark for Deletion
                    </>
                  )}
                </button>

                <button
                  onClick={() => keepOnlyThis(currentIndex)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm
                           transition-all duration-200 flex items-center gap-2"
                >
                  <MdCheckCircle className="w-5 h-5" />
                  Keep Only This
                </button>
              </div>

              {/* Thumbnail strip */}
              <div className="flex items-center gap-2">
                {allVersionIds.map((versionId, index) => (
                  <button
                    key={versionId}
                    onClick={() => setCurrentIndex(index)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      index === currentIndex
                        ? 'border-white shadow-lg scale-110'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                  >
                    <img
                      src={`/api/immich/assets/${versionId}/thumbnail`}
                      alt={`${allExtensions[index]} thumbnail`}
                      className="w-full h-full object-cover"
                    />
                    {markedForDeletion.has(index) && (
                      <div className="absolute inset-0 bg-red-600/80 flex items-center justify-center">
                        <MdDelete className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                      <p className="text-[10px] text-white font-medium text-center">
                        {allExtensions[index]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
