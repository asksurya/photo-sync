// services/gateway/src/clients/grouping.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { createLogger, format, transports, Logger } from 'winston';

const GET_GROUPS_TIMEOUT_MS = 30000;

export interface GroupMember {
  filePath: string;
  fileType: string;
  isPrimary: boolean;
  fileSize?: number;
}

export interface FileGroup {
  groupId: string;
  groupType: string;
  members: GroupMember[];
}

export class GroupingClient {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(baseUrl: string) {
    this.client = axios.create({
      baseURL: baseUrl,
    });

    this.logger = createLogger({
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [new transports.Console()],
    });
  }

  async getGroupsByPaths(paths: string[]): Promise<FileGroup[]> {
    // Input validation
    if (paths.length === 0) {
      throw new Error('Paths array cannot be empty');
    }

    // Validate that all paths are non-empty strings
    for (const path of paths) {
      if (!path || path.trim().length === 0) {
        throw new Error('All paths must be non-empty strings');
      }
    }

    try {
      const response = await this.client.get<FileGroup[]>('/groups', {
        params: {
          paths: paths,
        },
        timeout: GET_GROUPS_TIMEOUT_MS,
      });

      this.logger.debug('Groups fetched successfully', { count: response.data.length });
      return response.data;
    } catch (error) {
      // Use type guard instead of unsafe type casting
      if (error instanceof AxiosError) {
        // Handle different HTTP status codes
        if (error.response?.status === 400) {
          this.logger.error('Bad request to groups endpoint');
          throw new Error('Get groups failed: Bad request');
        }
        if (error.response?.status === 404) {
          this.logger.error('Groups endpoint not found');
          throw new Error('Get groups failed: Endpoint not found');
        }
        if (error.response?.status === 500) {
          this.logger.error('Server error from groups endpoint');
          throw new Error('Get groups failed: Server error');
        }
        if (error.response?.status === 503) {
          this.logger.error('Groups service unavailable');
          throw new Error('Get groups failed: Service unavailable');
        }
        // Handle timeout
        if (error.code === 'ECONNABORTED') {
          this.logger.error('Request timeout for groups endpoint');
          throw new Error('Get groups failed: Request timeout');
        }
      }

      // Wrap all other errors with context
      this.logger.error('Network error during get groups', { error });
      throw new Error(`Get groups failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
