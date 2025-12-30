// services/gateway/src/services/enrichment.ts
import { GroupingClient, FileGroup, GroupMember } from '../clients/grouping';
import { DeduplicationClient, DuplicateGroup, DuplicateMember } from '../clients/deduplication';
import { createLogger, format, transports, Logger } from 'winston';

export interface Asset {
  id: string;
  path?: string;
  type: string;
  size?: number;
  [key: string]: any;
}

export interface EnrichedAsset extends Asset {
  groupId?: string;
  groupType?: string;
  isPrimaryVersion?: boolean;
  alternateVersions?: string[];
  alternateVersionExtensions?: string[];
  duplicateGroupId?: string;
  duplicateType?: string;
  similarityScore?: number;
}

interface GroupInfo {
  groupId: string;
  groupType: string;
  isPrimary: boolean;
  alternateVersions: string[];
}

interface DuplicateInfo {
  duplicateGroupId: string;
  duplicateType: string;
  similarityScore: number;
}

export class EnrichmentService {
  private groupingClient: GroupingClient;
  private deduplicationClient: DeduplicationClient;
  private logger: Logger;

  constructor(groupingClient: GroupingClient, deduplicationClient: DeduplicationClient) {
    this.groupingClient = groupingClient;
    this.deduplicationClient = deduplicationClient;

    this.logger = createLogger({
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [new transports.Console()],
    });
  }

  async enrichAssets(assets: Asset[]): Promise<EnrichedAsset[]> {
    // Return early for empty array
    if (assets.length === 0) {
      return [];
    }

    try {
      // Extract file paths from assets
      const paths = this.extractPaths(assets);

      // If no valid paths, return assets as is
      if (paths.length === 0) {
        this.logger.debug('No valid paths found in assets');
        return assets;
      }

      // Fetch groups and duplicates in parallel
      const [groups, duplicates] = await Promise.all([
        this.groupingClient.getGroupsByPaths(paths),
        this.deduplicationClient.getDuplicatesByPaths(paths),
      ]);

      this.logger.debug('Enrichment data fetched', {
        groupCount: groups.length,
        duplicateCount: duplicates.length
      });

      // Build lookup maps for efficient merging
      const groupMap = this.buildGroupMap(groups);
      const duplicateMap = this.buildDuplicateMap(duplicates);

      // Merge enrichment data into each asset
      return this.mergeEnrichmentData(assets, groupMap, duplicateMap);
    } catch (error) {
      this.logger.error('Asset enrichment failed', { error });

      // Use type guard for error handling
      if (error instanceof Error) {
        throw new Error(`Asset enrichment failed: ${error.message}`);
      }

      throw new Error(`Asset enrichment failed: ${String(error)}`);
    }
  }

  private extractPaths(assets: Asset[]): string[] {
    const paths: string[] = [];

    for (const asset of assets) {
      // Check both 'path' and 'originalPath' fields (Immich uses 'originalPath')
      const filePath = asset.path || asset.originalPath;
      if (filePath && typeof filePath === 'string' && filePath.trim().length > 0) {
        paths.push(filePath);
      }
    }

    return paths;
  }

  private buildGroupMap(groups: FileGroup[]): Map<string, GroupInfo> {
    const map = new Map<string, GroupInfo>();

    for (const group of groups) {
      for (const member of group.members) {
        // Calculate alternate versions (all members except this one)
        const alternateVersions = group.members
          .filter((m: GroupMember) => m.filePath !== member.filePath)
          .map((m: GroupMember) => m.filePath);

        map.set(member.filePath, {
          groupId: group.groupId,
          groupType: group.groupType,
          isPrimary: member.isPrimary,
          alternateVersions,
        });
      }
    }

    return map;
  }

  private buildDuplicateMap(duplicates: DuplicateGroup[]): Map<string, DuplicateInfo> {
    const map = new Map<string, DuplicateInfo>();

    for (const duplicateGroup of duplicates) {
      for (const member of duplicateGroup.members) {
        map.set(member.filePath, {
          duplicateGroupId: duplicateGroup.groupId,
          duplicateType: duplicateGroup.duplicateType,
          similarityScore: member.similarityScore,
        });
      }
    }

    return map;
  }

  private mergeEnrichmentData(
    assets: Asset[],
    groupMap: Map<string, GroupInfo>,
    duplicateMap: Map<string, DuplicateInfo>
  ): EnrichedAsset[] {
    // Build a reverse map: file path -> asset ID for looking up alternate version IDs
    const pathToIdMap = new Map<string, string>();
    for (const asset of assets) {
      const filePath = asset.path || asset.originalPath;
      if (filePath) {
        pathToIdMap.set(filePath, asset.id);
      }
    }

    return assets.map((asset: Asset) => {
      // Don't mutate input - create new enriched object
      const enriched: EnrichedAsset = { ...asset };

      // Get the file path (check both 'path' and 'originalPath' fields)
      const filePath = asset.path || asset.originalPath;

      // Skip enrichment if asset has no path
      if (!filePath) {
        return enriched;
      }

      // Add group data if available
      const groupInfo = groupMap.get(filePath);
      if (groupInfo) {
        enriched.groupId = groupInfo.groupId;
        enriched.groupType = groupInfo.groupType;
        enriched.isPrimaryVersion = groupInfo.isPrimary;

        // Convert alternate version file paths to asset IDs
        enriched.alternateVersions = groupInfo.alternateVersions
          .map(path => pathToIdMap.get(path))
          .filter((id): id is string => id !== undefined);

        // Extract file extensions from alternate version paths
        enriched.alternateVersionExtensions = groupInfo.alternateVersions
          .map(path => {
            const parts = path.split('.');
            return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
          });
      }

      // Add duplicate data if available
      const duplicateInfo = duplicateMap.get(filePath);
      if (duplicateInfo) {
        enriched.duplicateGroupId = duplicateInfo.duplicateGroupId;
        enriched.duplicateType = duplicateInfo.duplicateType;
        enriched.similarityScore = duplicateInfo.similarityScore;
      }

      return enriched;
    });
  }
}
