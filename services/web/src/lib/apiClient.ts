// services/web/src/lib/apiClient.ts
import axios, { AxiosInstance } from 'axios';

export interface Asset {
  id: string;
  originalPath: string;
  type: string;
  createdAt: string;
  groupId?: string;
  groupType?: string;
  isPrimaryVersion?: boolean;
  alternateVersions?: Array<{
    originalPath: string;
    fileType: string;
    fileSize: number;
  }>;
  duplicateGroupId?: string;
  duplicateType?: string;
  similarityScore?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.token = token;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000
    });
  }

  async getAssets(skip: number, limit: number): Promise<Asset[]> {
    const response = await this.client.get('/api/assets', {
      params: { skip, limit },
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data.assets;
  }
}
