// services/web/src/lib/apiClient.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

export interface Asset {
  id: string;
  path?: string;
  originalPath?: string;
  type: string;
  size?: number;
  [key: string]: any;
}

export interface EnrichedAsset extends Asset {
  createdAt?: string;
  groupId?: string;
  groupType?: string;
  isPrimaryVersion?: boolean;
  alternateVersions?: string[];
  alternateVersionExtensions?: string[];
  duplicateGroupId?: string;
  duplicateType?: string;
  similarityScore?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private token: string;

  constructor(baseUrl: string, token: string) {
    // Validate token is not empty
    if (!token || token.trim().length === 0) {
      throw new Error('Token cannot be empty');
    }

    this.token = token;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000
    });
  }

  async getAssets(skip: number, limit: number): Promise<EnrichedAsset[]> {
    // Input validation
    if (skip < 0) {
      throw new Error('skip must be greater than or equal to 0');
    }
    if (limit <= 0) {
      throw new Error('limit must be greater than 0');
    }

    try {
      const response = await this.client.get('/api/assets', {
        params: { skip, limit },
        headers: { Authorization: `Bearer ${this.token}` }
      });
      return response.data.assets;
    } catch (error) {
      // Handle axios errors with meaningful messages
      if (this.isAxiosError(error)) {
        // Handle timeout errors
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout: Gateway did not respond in time');
        }

        // Handle HTTP status code errors
        if (error.response) {
          const status = error.response.status;
          switch (status) {
            case 401:
              throw new Error('Unauthorized: Invalid or expired token');
            case 403:
              throw new Error('Forbidden: Access denied');
            case 404:
              throw new Error('Not Found: Resource not found');
            case 500:
              throw new Error('Internal Server Error: Please try again later');
            case 503:
              throw new Error('Service Unavailable: Please try again later');
          }
        }
      }

      // Re-throw original error if not handled
      throw error;
    }
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }
}
