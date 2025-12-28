// services/gateway/src/clients/deduplication.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { createLogger, format, transports, Logger } from 'winston';

const GET_DUPLICATES_TIMEOUT_MS = 30000;

export interface DuplicateMember {
  filePath: string;
  similarityScore: number;
  fileSize?: number;
}

export interface DuplicateGroup {
  groupId: string;
  duplicateType: string;
  members: DuplicateMember[];
}

export class DeduplicationClient {
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

  async getDuplicatesByPaths(paths: string[]): Promise<DuplicateGroup[]> {
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
      const response = await this.client.get<DuplicateGroup[]>('/duplicates', {
        params: {
          paths: paths,
        },
        timeout: GET_DUPLICATES_TIMEOUT_MS,
      });

      this.logger.debug('Duplicates fetched successfully', { count: response.data.length });
      return response.data;
    } catch (error) {
      // Use type guard instead of unsafe type casting
      if (error instanceof AxiosError) {
        // Handle different HTTP status codes
        if (error.response?.status === 400) {
          this.logger.error('Bad request to duplicates endpoint');
          throw new Error('Get duplicates failed: Bad request');
        }
        if (error.response?.status === 404) {
          this.logger.error('Duplicates endpoint not found');
          throw new Error('Get duplicates failed: Endpoint not found');
        }
        if (error.response?.status === 500) {
          this.logger.error('Server error from duplicates endpoint');
          throw new Error('Get duplicates failed: Server error');
        }
        if (error.response?.status === 503) {
          this.logger.error('Duplicates service unavailable');
          throw new Error('Get duplicates failed: Service unavailable');
        }
        // Handle timeout
        if (error.code === 'ECONNABORTED') {
          this.logger.error('Request timeout for duplicates endpoint');
          throw new Error('Get duplicates failed: Request timeout');
        }
      }

      // Wrap all other errors with context
      this.logger.error('Network error during get duplicates', { error });
      throw new Error(`Get duplicates failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
