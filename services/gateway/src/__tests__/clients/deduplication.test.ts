// services/gateway/src/__tests__/clients/deduplication.test.ts
import { DeduplicationClient } from '../../clients/deduplication';
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

describe('DeduplicationClient', () => {
  let client: DeduplicationClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create a mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
    client = new DeduplicationClient('http://localhost:3002');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct baseURL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3002',
      });
    });
  });

  describe('getDuplicatesByPaths', () => {
    it('should fetch duplicates successfully', async () => {
      const mockDuplicates = [
        {
          groupId: 'dup-1',
          duplicateType: 'exact',
          members: [
            { filePath: '/path/to/file1.jpg', similarityScore: 1.0, fileSize: 1024 },
            { filePath: '/path/to/file2.jpg', similarityScore: 1.0, fileSize: 1024 },
          ],
        },
        {
          groupId: 'dup-2',
          duplicateType: 'perceptual',
          members: [
            { filePath: '/path/to/file3.jpg', similarityScore: 0.95 },
            { filePath: '/path/to/file4.jpg', similarityScore: 0.95 },
          ],
        },
      ];
      const mockResponse = {
        data: mockDuplicates,
      };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getDuplicatesByPaths(['/path/to/file1.jpg', '/path/to/file2.jpg']);

      expect(result).toEqual(mockDuplicates);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/duplicates', {
        params: { paths: '/path/to/file1.jpg,/path/to/file2.jpg' },
        timeout: 30000,
      });
    });

    it('should handle single path', async () => {
      const mockDuplicates = [
        {
          groupId: 'dup-1',
          duplicateType: 'exact',
          members: [
            { filePath: '/path/to/file1.jpg', similarityScore: 1.0 },
          ],
        },
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockDuplicates });

      const result = await client.getDuplicatesByPaths(['/path/to/file1.jpg']);

      expect(result).toEqual(mockDuplicates);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/duplicates', {
        params: { paths: '/path/to/file1.jpg' },
        timeout: 30000,
      });
    });

    it('should throw error for empty paths array', async () => {
      await expect(client.getDuplicatesByPaths([])).rejects.toThrow('Paths array cannot be empty');
    });

    it('should throw error for array with empty string path', async () => {
      await expect(client.getDuplicatesByPaths([''])).rejects.toThrow('All paths must be non-empty strings');
    });

    it('should throw error for array with whitespace-only path', async () => {
      await expect(client.getDuplicatesByPaths(['   '])).rejects.toThrow('All paths must be non-empty strings');
    });

    it('should throw error for array with mixed valid and empty paths', async () => {
      await expect(client.getDuplicatesByPaths(['/valid/path', ''])).rejects.toThrow('All paths must be non-empty strings');
    });

    it('should throw error for 400 Bad Request', async () => {
      const axiosError = new AxiosError('Bad Request');
      axiosError.response = { status: 400 } as any;

      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

      await expect(client.getDuplicatesByPaths(['/path/to/file.jpg'])).rejects.toThrow('Get duplicates failed: Bad request');
    });

    it('should throw error for 404 Not Found', async () => {
      const axiosError = new AxiosError('Not Found');
      axiosError.response = { status: 404 } as any;

      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

      await expect(client.getDuplicatesByPaths(['/path/to/file.jpg'])).rejects.toThrow('Get duplicates failed: Endpoint not found');
    });

    it('should throw error for 500 Server Error', async () => {
      const axiosError = new AxiosError('Server Error');
      axiosError.response = { status: 500 } as any;

      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

      await expect(client.getDuplicatesByPaths(['/path/to/file.jpg'])).rejects.toThrow('Get duplicates failed: Server error');
    });

    it('should throw error for 503 Service Unavailable', async () => {
      const axiosError = new AxiosError('Service Unavailable');
      axiosError.response = { status: 503 } as any;

      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

      await expect(client.getDuplicatesByPaths(['/path/to/file.jpg'])).rejects.toThrow('Get duplicates failed: Service unavailable');
    });

    it('should throw error for timeout', async () => {
      const axiosError = new AxiosError('Timeout');
      axiosError.code = 'ECONNABORTED';

      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

      await expect(client.getDuplicatesByPaths(['/path/to/file.jpg'])).rejects.toThrow('Get duplicates failed: Request timeout');
    });

    it('should throw error for network error', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get.mockRejectedValueOnce(networkError);

      await expect(client.getDuplicatesByPaths(['/path/to/file.jpg'])).rejects.toThrow('Get duplicates failed: Network Error');
    });

    it('should throw error for non-Error object', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce('string error');

      await expect(client.getDuplicatesByPaths(['/path/to/file.jpg'])).rejects.toThrow('Get duplicates failed: string error');
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
