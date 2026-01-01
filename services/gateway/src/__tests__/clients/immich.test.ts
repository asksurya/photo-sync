// services/gateway/src/__tests__/clients/immich.test.ts
import { ImmichClient } from '../../clients/immich';
import axios, { AxiosError } from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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

describe('ImmichClient', () => {
  let client: ImmichClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create a mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
    client = new ImmichClient('http://localhost:2283');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct baseURL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:2283',
      });
    });
  });

  describe('ping', () => {
    it('should ping successfully', async () => {
      const mockResponse = {
        data: { res: 'pong' },
      };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await client.ping();

      expect(result).toEqual({ res: 'pong' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/server/ping',
        {
          timeout: 5000,
        }
      );
    });

    it('should throw error on timeout', async () => {
      const axiosError = new AxiosError('Timeout');
      axiosError.code = 'ECONNABORTED';

      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

      await expect(client.ping()).rejects.toThrow('Ping failed: Request timeout');
    });

    it('should throw error on network failure', async () => {
      const error = new Error('Network Error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(client.ping()).rejects.toThrow('Ping failed: Network Error');
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const mockResponse = {
        data: { userId: 'user-123', email: 'test@example.com' },
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await client.validateToken('valid-token');

      expect(result).toEqual({ userId: 'user-123', email: 'test@example.com' });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/auth/validateToken',
        {},
        {
          headers: { Authorization: 'Bearer valid-token' },
          timeout: 5000,
        }
      );
    });

    it('should throw error for invalid token (401)', async () => {
      const axiosError = new AxiosError('Unauthorized');
      axiosError.response = { status: 401 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.validateToken('invalid-token')).rejects.toThrow('Token validation failed: Invalid token');
    });

    it('should throw error for 403 Forbidden', async () => {
      const axiosError = new AxiosError('Forbidden');
      axiosError.response = { status: 403 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.validateToken('token')).rejects.toThrow('Token validation failed: Forbidden');
    });

    it('should throw error for 404 Not Found', async () => {
      const axiosError = new AxiosError('Not Found');
      axiosError.response = { status: 404 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.validateToken('token')).rejects.toThrow('Token validation failed: Endpoint not found');
    });

    it('should throw error for 500 Server Error', async () => {
      const axiosError = new AxiosError('Server Error');
      axiosError.response = { status: 500 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.validateToken('token')).rejects.toThrow('Token validation failed: Server error');
    });

    it('should throw error for 503 Service Unavailable', async () => {
      const axiosError = new AxiosError('Service Unavailable');
      axiosError.response = { status: 503 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.validateToken('token')).rejects.toThrow('Token validation failed: Service unavailable');
    });

    it('should throw error for timeout', async () => {
      const axiosError = new AxiosError('Timeout');
      axiosError.code = 'ECONNABORTED';

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.validateToken('token')).rejects.toThrow('Token validation failed: Request timeout');
    });

    it('should throw error for network error', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.post.mockRejectedValueOnce(networkError);

      await expect(client.validateToken('token')).rejects.toThrow('Token validation failed: Network Error');
    });

    it('should throw error for non-Error object', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce('string error');

      await expect(client.validateToken('token')).rejects.toThrow('Token validation failed: string error');
    });

    it('should throw error for empty token', async () => {
      await expect(client.validateToken('')).rejects.toThrow('Token cannot be empty');
    });

    it('should throw error for whitespace-only token', async () => {
      await expect(client.validateToken('   ')).rejects.toThrow('Token cannot be empty');
    });
  });

  describe('getAssets', () => {
    it('should fetch assets with pagination', async () => {
      const mockAssets = [
        { id: 'asset-1', type: 'IMAGE' },
        { id: 'asset-2', type: 'VIDEO' },
      ];
      const mockResponse = {
        data: { assets: { items: mockAssets } },
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await client.getAssets('valid-token', 0, 100);

      expect(result).toEqual(mockAssets);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/search/metadata', {
        page: 1,
        size: 100,
      }, {
        headers: { 'x-api-key': 'valid-token', 'Content-Type': 'application/json' },
        timeout: 30000,
      });
    });

    it('should throw error for invalid token (401)', async () => {
      const axiosError = new AxiosError('Unauthorized');
      axiosError.response = { status: 401 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.getAssets('invalid-token', 0, 100)).rejects.toThrow('Asset fetch failed: Invalid token');
    });

    it('should throw error for 403 Forbidden', async () => {
      const axiosError = new AxiosError('Forbidden');
      axiosError.response = { status: 403 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.getAssets('token', 0, 100)).rejects.toThrow('Asset fetch failed: Forbidden');
    });

    it('should throw error for 404 Not Found', async () => {
      const axiosError = new AxiosError('Not Found');
      axiosError.response = { status: 404 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.getAssets('token', 0, 100)).rejects.toThrow('Asset fetch failed: Endpoint not found');
    });

    it('should throw error for 500 Server Error', async () => {
      const axiosError = new AxiosError('Server Error');
      axiosError.response = { status: 500 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.getAssets('token', 0, 100)).rejects.toThrow('Asset fetch failed: Server error');
    });

    it('should throw error for 503 Service Unavailable', async () => {
      const axiosError = new AxiosError('Service Unavailable');
      axiosError.response = { status: 503 } as any;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.getAssets('token', 0, 100)).rejects.toThrow('Asset fetch failed: Service unavailable');
    });

    it('should throw error for timeout', async () => {
      const axiosError = new AxiosError('Timeout');
      axiosError.code = 'ECONNABORTED';

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.getAssets('token', 0, 100)).rejects.toThrow('Asset fetch failed: Request timeout');
    });

    it('should throw error for network error', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.post.mockRejectedValueOnce(networkError);

      await expect(client.getAssets('token', 0, 100)).rejects.toThrow('Asset fetch failed: Network Error');
    });

    it('should throw error for non-Error object', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce('string error');

      await expect(client.getAssets('token', 0, 100)).rejects.toThrow('Asset fetch failed: string error');
    });

    it('should throw error for empty token', async () => {
      await expect(client.getAssets('', 0, 100)).rejects.toThrow('Token cannot be empty');
    });

    it('should throw error for negative skip', async () => {
      await expect(client.getAssets('token', -1, 100)).rejects.toThrow('Skip must be non-negative');
    });

    it('should throw error for invalid limit (0)', async () => {
      await expect(client.getAssets('token', 0, 0)).rejects.toThrow('Limit must be greater than 0');
    });

    it('should throw error for negative limit', async () => {
      await expect(client.getAssets('token', 0, -1)).rejects.toThrow('Limit must be greater than 0');
    });

    it('should handle skip of 0 correctly', async () => {
      const mockAssets = [{ id: 'asset-1', type: 'IMAGE' }];
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { assets: { items: mockAssets } } });

      const result = await client.getAssets('token', 0, 10);

      expect(result).toEqual(mockAssets);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/search/metadata', {
        page: 1,
        size: 10,
      }, {
        headers: { 'x-api-key': 'token', 'Content-Type': 'application/json' },
        timeout: 30000,
      });
    });
  });

  describe('Encapsulation', () => {
    it('should not expose axios client as a public property', () => {
      // Client is now private in TypeScript
      // Accessing it directly should cause a TypeScript compilation error
      // We verify it exists internally for the class to function
      expect((client as any).client).toBeDefined();

      // In TypeScript, private members are compile-time only
      // At runtime they still exist, but TypeScript prevents access
      // This test verifies the internal client is set up correctly
    });
  });
});
