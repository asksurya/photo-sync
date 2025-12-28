// services/web/src/__tests__/lib/apiClient.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '../../lib/apiClient';
import axios, { AxiosError } from 'axios';

vi.mock('axios');

describe('ApiClient', () => {
  let client: ApiClient;
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock axios.create to return an object with a get method
    vi.mocked(axios.create).mockReturnValue({
      get: mockGet,
    } as any);

    client = new ApiClient('http://localhost:3000', 'test-token');
  });

  describe('constructor', () => {
    it('should throw error if token is empty', () => {
      expect(() => new ApiClient('http://localhost:3000', '')).toThrow(
        'Token cannot be empty'
      );
    });

    it('should throw error if token is whitespace', () => {
      expect(() => new ApiClient('http://localhost:3000', '   ')).toThrow(
        'Token cannot be empty'
      );
    });
  });

  describe('getAssets', () => {
    it('should get enriched assets with correct structure', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          path: '/photos/img1.jpg',
          type: 'image/jpeg',
          size: 1024,
          groupId: 'grp-1',
          groupType: 'burst',
          isPrimaryVersion: true,
          alternateVersions: ['/photos/img2.jpg', '/photos/img3.jpg'],
          duplicateGroupId: 'dup-1',
          duplicateType: 'exact',
          similarityScore: 0.95
        }
      ];
      mockGet.mockResolvedValue({ data: { assets: mockAssets } });

      const result = await client.getAssets(0, 100);

      expect(result).toEqual(mockAssets);
      expect(mockGet).toHaveBeenCalledWith(
        '/api/assets',
        expect.objectContaining({
          params: { skip: 0, limit: 100 },
          headers: { Authorization: 'Bearer test-token' }
        })
      );
    });

    it('should handle empty asset array', async () => {
      mockGet.mockResolvedValue({ data: { assets: [] } });

      const result = await client.getAssets(0, 100);

      expect(result).toEqual([]);
    });

    // Input validation tests
    it('should throw error if skip is negative', async () => {
      await expect(client.getAssets(-1, 100)).rejects.toThrow(
        'skip must be greater than or equal to 0'
      );
    });

    it('should throw error if limit is zero', async () => {
      await expect(client.getAssets(0, 0)).rejects.toThrow(
        'limit must be greater than 0'
      );
    });

    it('should throw error if limit is negative', async () => {
      await expect(client.getAssets(0, -10)).rejects.toThrow(
        'limit must be greater than 0'
      );
    });

    // HTTP error response tests
    it('should handle 401 Unauthorized error', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 401 }
      } as AxiosError;
      mockGet.mockRejectedValue(error);

      await expect(client.getAssets(0, 100)).rejects.toThrow(
        'Unauthorized: Invalid or expired token'
      );
    });

    it('should handle 403 Forbidden error', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 403 }
      } as AxiosError;
      mockGet.mockRejectedValue(error);

      await expect(client.getAssets(0, 100)).rejects.toThrow(
        'Forbidden: Access denied'
      );
    });

    it('should handle 404 Not Found error', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 404 }
      } as AxiosError;
      mockGet.mockRejectedValue(error);

      await expect(client.getAssets(0, 100)).rejects.toThrow(
        'Not Found: Resource not found'
      );
    });

    it('should handle 500 Internal Server Error', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 500 }
      } as AxiosError;
      mockGet.mockRejectedValue(error);

      await expect(client.getAssets(0, 100)).rejects.toThrow(
        'Internal Server Error: Please try again later'
      );
    });

    it('should handle 503 Service Unavailable error', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 503 }
      } as AxiosError;
      mockGet.mockRejectedValue(error);

      await expect(client.getAssets(0, 100)).rejects.toThrow(
        'Service Unavailable: Please try again later'
      );
    });

    it('should handle timeout errors', async () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNABORTED'
      } as AxiosError;
      mockGet.mockRejectedValue(error);

      await expect(client.getAssets(0, 100)).rejects.toThrow(
        'Request timeout: Gateway did not respond in time'
      );
    });

    it('should handle network errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(client.getAssets(0, 100)).rejects.toThrow('Network error');
    });
  });
});
