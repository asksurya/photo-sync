// services/gateway/src/__tests__/services/enrichment.test.ts
import { EnrichmentService } from '../../services/enrichment';
import { GroupingClient, FileGroup } from '../../clients/grouping';
import { DeduplicationClient, DuplicateGroup } from '../../clients/deduplication';

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
}));

// Mock clients
jest.mock('../../clients/grouping');
jest.mock('../../clients/deduplication');

describe('EnrichmentService', () => {
  let enrichmentService: EnrichmentService;
  let mockGroupingClient: jest.Mocked<GroupingClient>;
  let mockDeduplicationClient: jest.Mocked<DeduplicationClient>;

  beforeEach(() => {
    mockGroupingClient = {
      getGroupsByPaths: jest.fn(),
    } as any;

    mockDeduplicationClient = {
      getDuplicatesByPaths: jest.fn(),
    } as any;

    enrichmentService = new EnrichmentService(mockGroupingClient, mockDeduplicationClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichAssets', () => {
    it('should return empty array for empty input', async () => {
      const result = await enrichmentService.enrichAssets([]);

      expect(result).toEqual([]);
      expect(mockGroupingClient.getGroupsByPaths).not.toHaveBeenCalled();
      expect(mockDeduplicationClient.getDuplicatesByPaths).not.toHaveBeenCalled();
    });

    it('should enrich assets with both group and duplicate data', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
        {
          id: 'asset-2',
          path: '/path/to/file2.jpg',
          type: 'image',
          size: 2048,
        },
      ];

      const mockGroups: FileGroup[] = [
        {
          groupId: 'group-1',
          groupType: 'similar',
          members: [
            { filePath: '/path/to/file1.jpg', fileType: 'image', isPrimary: true, fileSize: 1024 },
            { filePath: '/path/to/file2.jpg', fileType: 'image', isPrimary: false, fileSize: 2048 },
          ],
        },
      ];

      const mockDuplicates: DuplicateGroup[] = [
        {
          groupId: 'dup-1',
          duplicateType: 'exact',
          members: [
            { filePath: '/path/to/file1.jpg', similarityScore: 1.0 },
            { filePath: '/path/to/file3.jpg', similarityScore: 1.0 },
          ],
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce(mockGroups);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce(mockDuplicates);

      const result = await enrichmentService.enrichAssets(assets);

      // Verify parallel fetching
      expect(mockGroupingClient.getGroupsByPaths).toHaveBeenCalledWith(['/path/to/file1.jpg', '/path/to/file2.jpg']);
      expect(mockDeduplicationClient.getDuplicatesByPaths).toHaveBeenCalledWith(['/path/to/file1.jpg', '/path/to/file2.jpg']);

      // Verify enrichment for asset-1 (has both group and duplicate data)
      expect(result[0]).toEqual({
        id: 'asset-1',
        path: '/path/to/file1.jpg',
        type: 'image',
        size: 1024,
        groupId: 'group-1',
        groupType: 'similar',
        isPrimaryVersion: true,
        alternateVersions: ['asset-2'],
        alternateVersionExtensions: ['JPG'],
        duplicateGroupId: 'dup-1',
        duplicateType: 'exact',
        similarityScore: 1.0,
      });

      // Verify enrichment for asset-2 (has only group data)
      expect(result[1]).toEqual({
        id: 'asset-2',
        path: '/path/to/file2.jpg',
        type: 'image',
        size: 2048,
        groupId: 'group-1',
        groupType: 'similar',
        isPrimaryVersion: false,
        alternateVersions: ['asset-1'],
        alternateVersionExtensions: ['JPG'],
      });
    });

    it('should enrich assets with only group data when no duplicates found', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
      ];

      const mockGroups: FileGroup[] = [
        {
          groupId: 'group-1',
          groupType: 'burst',
          members: [
            { filePath: '/path/to/file1.jpg', fileType: 'image', isPrimary: true },
          ],
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce(mockGroups);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

      const result = await enrichmentService.enrichAssets(assets);

      expect(result[0]).toEqual({
        id: 'asset-1',
        path: '/path/to/file1.jpg',
        type: 'image',
        size: 1024,
        groupId: 'group-1',
        groupType: 'burst',
        isPrimaryVersion: true,
        alternateVersions: [],
        alternateVersionExtensions: [],
      });
    });

    it('should enrich assets with only duplicate data when no groups found', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
      ];

      const mockDuplicates: DuplicateGroup[] = [
        {
          groupId: 'dup-1',
          duplicateType: 'perceptual',
          members: [
            { filePath: '/path/to/file1.jpg', similarityScore: 0.95 },
            { filePath: '/path/to/file2.jpg', similarityScore: 0.95 },
          ],
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce(mockDuplicates);

      const result = await enrichmentService.enrichAssets(assets);

      expect(result[0]).toEqual({
        id: 'asset-1',
        path: '/path/to/file1.jpg',
        type: 'image',
        size: 1024,
        duplicateGroupId: 'dup-1',
        duplicateType: 'perceptual',
        similarityScore: 0.95,
      });
    });

    it('should return assets unchanged when no enrichment data available', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
        {
          id: 'asset-2',
          path: '/path/to/file2.jpg',
          type: 'image',
          size: 2048,
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

      const result = await enrichmentService.enrichAssets(assets);

      expect(result).toEqual(assets);
    });

    it('should handle assets without path gracefully', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
        {
          id: 'asset-2',
          type: 'image',
          size: 2048,
        },
      ];

      const mockGroups: FileGroup[] = [
        {
          groupId: 'group-1',
          groupType: 'similar',
          members: [
            { filePath: '/path/to/file1.jpg', fileType: 'image', isPrimary: true },
          ],
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce(mockGroups);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

      const result = await enrichmentService.enrichAssets(assets);

      // Asset with path should be enriched
      expect(result[0]).toEqual({
        id: 'asset-1',
        path: '/path/to/file1.jpg',
        type: 'image',
        size: 1024,
        groupId: 'group-1',
        groupType: 'similar',
        isPrimaryVersion: true,
        alternateVersions: [],
        alternateVersionExtensions: [],
      });

      // Asset without path should remain unchanged
      expect(result[1]).toEqual({
        id: 'asset-2',
        type: 'image',
        size: 2048,
      });
    });

    it('should only fetch data for assets with valid paths', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
        {
          id: 'asset-2',
          type: 'image',
          size: 2048,
        },
        {
          id: 'asset-3',
          path: '/path/to/file3.jpg',
          type: 'image',
          size: 3072,
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

      await enrichmentService.enrichAssets(assets);

      // Should only include assets with paths
      expect(mockGroupingClient.getGroupsByPaths).toHaveBeenCalledWith(['/path/to/file1.jpg', '/path/to/file3.jpg']);
      expect(mockDeduplicationClient.getDuplicatesByPaths).toHaveBeenCalledWith(['/path/to/file1.jpg', '/path/to/file3.jpg']);
    });

    it('should propagate errors from grouping client', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
      ];

      const error = new Error('Grouping service error');
      mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce(error);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

      await expect(enrichmentService.enrichAssets(assets)).rejects.toThrow('Asset enrichment failed: Grouping service error');
    });

    it('should propagate errors from deduplication client', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
      ];

      const error = new Error('Deduplication service error');
      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
      mockDeduplicationClient.getDuplicatesByPaths.mockRejectedValueOnce(error);

      await expect(enrichmentService.enrichAssets(assets)).rejects.toThrow('Asset enrichment failed: Deduplication service error');
    });

    it('should handle non-Error objects from clients', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce('string error');
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

      await expect(enrichmentService.enrichAssets(assets)).rejects.toThrow('Asset enrichment failed: string error');
    });

    it('should not mutate input assets', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
      ];

      const originalAssets = JSON.parse(JSON.stringify(assets));

      const mockGroups: FileGroup[] = [
        {
          groupId: 'group-1',
          groupType: 'similar',
          members: [
            { filePath: '/path/to/file1.jpg', fileType: 'image', isPrimary: true },
          ],
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce(mockGroups);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

      await enrichmentService.enrichAssets(assets);

      // Verify original assets are unchanged
      expect(assets).toEqual(originalAssets);
    });

    it('should handle multiple groups for different assets', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
        {
          id: 'asset-2',
          path: '/path/to/file2.jpg',
          type: 'image',
          size: 2048,
        },
      ];

      const mockGroups: FileGroup[] = [
        {
          groupId: 'group-1',
          groupType: 'similar',
          members: [
            { filePath: '/path/to/file1.jpg', fileType: 'image', isPrimary: true },
          ],
        },
        {
          groupId: 'group-2',
          groupType: 'burst',
          members: [
            { filePath: '/path/to/file2.jpg', fileType: 'image', isPrimary: true },
          ],
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce(mockGroups);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

      const result = await enrichmentService.enrichAssets(assets);

      expect(result[0]).toEqual({
        id: 'asset-1',
        path: '/path/to/file1.jpg',
        type: 'image',
        size: 1024,
        groupId: 'group-1',
        groupType: 'similar',
        isPrimaryVersion: true,
        alternateVersions: [],
        alternateVersionExtensions: [],
      });

      expect(result[1]).toEqual({
        id: 'asset-2',
        path: '/path/to/file2.jpg',
        type: 'image',
        size: 2048,
        groupId: 'group-2',
        groupType: 'burst',
        isPrimaryVersion: true,
        alternateVersions: [],
        alternateVersionExtensions: [],
      });
    });

    it('should calculate alternate versions correctly', async () => {
      const assets = [
        {
          id: 'asset-1',
          path: '/path/to/file1.jpg',
          type: 'image',
          size: 1024,
        },
        {
          id: 'asset-2',
          path: '/path/to/file2.jpg',
          type: 'image',
          size: 1024,
        },
        {
          id: 'asset-3',
          path: '/path/to/file3.jpg',
          type: 'image',
          size: 1024,
        },
      ];

      const mockGroups: FileGroup[] = [
        {
          groupId: 'group-1',
          groupType: 'similar',
          members: [
            { filePath: '/path/to/file1.jpg', fileType: 'image', isPrimary: true },
            { filePath: '/path/to/file2.jpg', fileType: 'image', isPrimary: false },
            { filePath: '/path/to/file3.jpg', fileType: 'image', isPrimary: false },
          ],
        },
      ];

      mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce(mockGroups);
      mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

      const result = await enrichmentService.enrichAssets(assets);

      // Alternate versions should contain asset IDs, not file paths
      expect(result[0].alternateVersions).toEqual(['asset-2', 'asset-3']);
      expect(result[0].alternateVersionExtensions).toEqual(['JPG', 'JPG']);
    });

    it('should return assets unchanged when all assets have no paths', async () => {
      const assets = [
        {
          id: 'asset-1',
          type: 'image',
          size: 1024,
        },
        {
          id: 'asset-2',
          type: 'video',
          size: 2048,
        },
      ];

      const result = await enrichmentService.enrichAssets(assets);

      expect(result).toEqual(assets);
      expect(mockGroupingClient.getGroupsByPaths).not.toHaveBeenCalled();
      expect(mockDeduplicationClient.getDuplicatesByPaths).not.toHaveBeenCalled();
    });
  });
});
