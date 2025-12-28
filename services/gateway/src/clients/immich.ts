// services/gateway/src/clients/immich.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { createLogger, format, transports, Logger } from 'winston';

const VALIDATE_TOKEN_TIMEOUT_MS = 5000;
const GET_ASSETS_TIMEOUT_MS = 30000;

export interface TokenValidation {
  userId: string;
  email: string;
}

export interface Asset {
  id: string;
  type: string;
}

export class ImmichClient {
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

  async validateToken(token: string): Promise<TokenValidation> {
    // Input validation
    if (!token || token.trim().length === 0) {
      throw new Error('Token cannot be empty');
    }

    try {
      const response = await this.client.post<TokenValidation>(
        '/api/auth/validateToken',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: VALIDATE_TOKEN_TIMEOUT_MS,
        }
      );

      this.logger.debug('Token validated successfully');
      return response.data;
    } catch (error) {
      // Use type guard instead of unsafe type casting
      if (error instanceof AxiosError) {
        // Handle different HTTP status codes
        if (error.response?.status === 401) {
          this.logger.error('Invalid token provided');
          throw new Error('Token validation failed: Invalid token');
        }
        if (error.response?.status === 403) {
          this.logger.error('Forbidden');
          throw new Error('Token validation failed: Forbidden');
        }
        if (error.response?.status === 404) {
          this.logger.error('Endpoint not found');
          throw new Error('Token validation failed: Endpoint not found');
        }
        if (error.response?.status === 500) {
          this.logger.error('Server error');
          throw new Error('Token validation failed: Server error');
        }
        if (error.response?.status === 503) {
          this.logger.error('Service unavailable');
          throw new Error('Token validation failed: Service unavailable');
        }
        // Handle timeout
        if (error.code === 'ECONNABORTED') {
          this.logger.error('Request timeout');
          throw new Error('Token validation failed: Request timeout');
        }
      }

      // Wrap all other errors with context
      this.logger.error('Network error during token validation', { error });
      throw new Error(`Token validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getAssets(token: string, skip: number, limit: number): Promise<Asset[]> {
    // Input validation
    if (!token || token.trim().length === 0) {
      throw new Error('Token cannot be empty');
    }
    if (skip < 0) {
      throw new Error('Skip must be non-negative');
    }
    if (limit <= 0) {
      throw new Error('Limit must be greater than 0');
    }

    try {
      const response = await this.client.get<Asset[]>('/api/assets', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          skip,
          limit,
        },
        timeout: GET_ASSETS_TIMEOUT_MS,
      });

      this.logger.debug('Assets fetched successfully', { count: response.data.length });
      return response.data;
    } catch (error) {
      // Use type guard instead of unsafe type casting
      if (error instanceof AxiosError) {
        // Handle different HTTP status codes
        if (error.response?.status === 401) {
          this.logger.error('Invalid token provided for asset fetch');
          throw new Error('Asset fetch failed: Invalid token');
        }
        if (error.response?.status === 403) {
          this.logger.error('Forbidden');
          throw new Error('Asset fetch failed: Forbidden');
        }
        if (error.response?.status === 404) {
          this.logger.error('Endpoint not found');
          throw new Error('Asset fetch failed: Endpoint not found');
        }
        if (error.response?.status === 500) {
          this.logger.error('Server error');
          throw new Error('Asset fetch failed: Server error');
        }
        if (error.response?.status === 503) {
          this.logger.error('Service unavailable');
          throw new Error('Asset fetch failed: Service unavailable');
        }
        // Handle timeout
        if (error.code === 'ECONNABORTED') {
          this.logger.error('Request timeout');
          throw new Error('Asset fetch failed: Request timeout');
        }
      }

      // Wrap all other errors with context
      this.logger.error('Network error during asset fetch', { error });
      throw new Error(`Asset fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
