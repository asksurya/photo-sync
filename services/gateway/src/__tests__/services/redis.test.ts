// services/gateway/src/__tests__/services/redis.test.ts
import { RedisCache } from '../../services/redis';
import { createHash } from 'crypto';
import { createClient } from 'redis';

// Mock the redis module
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisCache', () => {
  let cache: RedisCache;
  let mockRedisClient: any;

  beforeEach(() => {
    // Create a mock Redis client
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      setEx: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
    cache = new RedisCache('redis://localhost:6379');
  });

  afterEach(async () => {
    await cache.disconnect();
    jest.clearAllMocks();
  });

  it('should store and retrieve token validation', async () => {
    const token = 'test-token-123';
    const validation = { userId: 'user-1', email: 'test@example.com' };

    // Mock get to return the stored value
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(validation));

    await cache.setTokenValidation(token, validation, 300);
    const result = await cache.getTokenValidation(token);

    expect(result).toEqual(validation);
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(
      `auth:token:${createHash('sha256').update(token).digest('hex')}`,
      300,
      JSON.stringify(validation)
    );
  });

  it('should return null for missing token', async () => {
    mockRedisClient.get.mockResolvedValueOnce(null);
    const result = await cache.getTokenValidation('nonexistent');
    expect(result).toBeNull();
  });

  it('should hash tokens before storage', async () => {
    const token = 'sensitive-token';
    const validation = { userId: 'user-1', email: 'test@example.com' };
    const expectedHash = createHash('sha256').update(token).digest('hex');

    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(validation));

    await cache.setTokenValidation(token, validation, 300);
    const result = await cache.getTokenValidation(token);

    expect(result).toEqual(validation);
    // Verify the token was hashed
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(
      `auth:token:${expectedHash}`,
      300,
      JSON.stringify(validation)
    );
  });

  it('should handle connection errors gracefully', async () => {
    const errorMockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      setEx: jest.fn().mockRejectedValue(new Error('Connection refused')),
    };

    (createClient as jest.Mock).mockReturnValue(errorMockClient);
    const badCache = new RedisCache('redis://invalid:9999');

    // Should throw connection error
    await expect(
      badCache.setTokenValidation('token', { userId: 'u1', email: 'e@e.com' }, 300)
    ).rejects.toThrow('Connection refused');

    await badCache.disconnect();
  });

  it('should handle malformed JSON in cache', async () => {
    mockRedisClient.get.mockResolvedValueOnce('invalid-json');

    await expect(
      cache.getTokenValidation('bad-token')
    ).rejects.toThrow();
  });
});
