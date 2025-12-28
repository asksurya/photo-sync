// services/web/src/__tests__/lib/apiClient.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '../../lib/apiClient';
import axios from 'axios';

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

  it('should get enriched assets', async () => {
    const mockAssets = [
      { id: 'asset-1', originalPath: '/photos/img1.jpg', groupId: 'grp-1' }
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

  it('should handle network errors', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    await expect(client.getAssets(0, 100)).rejects.toThrow('Network error');
  });
});
