// services/gateway/src/clients/immich.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { createLogger, format, transports } from 'winston';

const VALIDATE_TOKEN_TIMEOUT_MS = 5000;
const GET_ASSETS_TIMEOUT_MS = 30000;

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()],
});

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

  constructor(baseUrl: string) {
    this.client = axios.create({
      baseURL: baseUrl,
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

      logger.debug('Token validated successfully');
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        logger.error('Invalid token provided');
        throw new Error('Invalid token');
      }

      logger.error('Network error during token validation', { error });
      throw new Error('Network error during token validation');
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

      logger.debug('Assets fetched successfully', { count: response.data.length });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        logger.error('Invalid token provided for asset fetch');
        throw new Error('Invalid token');
      }

      logger.error('Network error during asset fetch', { error });
      throw new Error('Network error during asset fetch');
    }
  }
}
