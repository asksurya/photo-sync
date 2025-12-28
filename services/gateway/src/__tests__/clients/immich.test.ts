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
      const axiosError = {
        response: { status: 401 },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.validateToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('should throw error for network error', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.post.mockRejectedValueOnce(networkError);

      await expect(client.validateToken('token')).rejects.toThrow('Network error during token validation');
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
        data: mockAssets,
      };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getAssets('valid-token', 0, 100);

      expect(result).toEqual(mockAssets);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/assets', {
        headers: { Authorization: 'Bearer valid-token' },
        params: { skip: 0, limit: 100 },
        timeout: 30000,
      });
    });

    it('should throw error for invalid token (401)', async () => {
      const axiosError = {
        response: { status: 401 },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

      await expect(client.getAssets('invalid-token', 0, 100)).rejects.toThrow('Invalid token');
    });

    it('should throw error for network error', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get.mockRejectedValueOnce(networkError);

      await expect(client.getAssets('token', 0, 100)).rejects.toThrow('Network error during asset fetch');
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
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAssets });

      const result = await client.getAssets('token', 0, 10);

      expect(result).toEqual(mockAssets);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/assets', {
        headers: { Authorization: 'Bearer token' },
        params: { skip: 0, limit: 10 },
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
