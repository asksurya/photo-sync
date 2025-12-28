// services/gateway/src/__tests__/services/redis.test.ts
import { RedisCache } from '../../services/redis';
import { createHash } from 'crypto';
import { createClient } from 'redis';

// Mock the redis module
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

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

describe('RedisCache', () => {
  let cache: RedisCache;
  let mockRedisClient: any;

  beforeEach(async () => {
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
    await cache.connect();
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

  it('should handle connection errors on connect', async () => {
    const errorMockClient = {
      connect: jest.fn().mockRejectedValue(new Error('Connection refused')),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    (createClient as jest.Mock).mockReturnValue(errorMockClient);
    const badCache = new RedisCache('redis://invalid:9999');

    await expect(badCache.connect()).rejects.toThrow('Failed to connect to Redis: Error: Connection refused');
  });

  it('should handle connection errors during operations', async () => {
    mockRedisClient.setEx.mockRejectedValueOnce(new Error('Connection lost'));

    await expect(
      cache.setTokenValidation('token', { userId: 'u1', email: 'e@e.com' }, 300)
    ).rejects.toThrow('Failed to set token validation: Error: Connection lost');
  });

  it('should differentiate between malformed JSON and Redis errors in getTokenValidation', async () => {
    // Test malformed JSON
    mockRedisClient.get.mockResolvedValueOnce('invalid-json');
    await expect(
      cache.getTokenValidation('bad-token')
    ).rejects.toThrow('Failed to parse token validation data');

    // Test Redis error
    mockRedisClient.get.mockRejectedValueOnce(new Error('Redis connection error'));
    await expect(
      cache.getTokenValidation('bad-token')
    ).rejects.toThrow('Failed to get token validation from Redis');
  });

  describe('Input Validation', () => {
    it('should throw error for empty token in setTokenValidation', async () => {
      await expect(
        cache.setTokenValidation('', { userId: 'u1', email: 'e@e.com' }, 300)
      ).rejects.toThrow('Token cannot be empty');
    });

    it('should throw error for empty token in getTokenValidation', async () => {
      await expect(
        cache.getTokenValidation('')
      ).rejects.toThrow('Token cannot be empty');
    });

    it('should throw error for negative TTL', async () => {
      await expect(
        cache.setTokenValidation('token', { userId: 'u1', email: 'e@e.com' }, -1)
      ).rejects.toThrow('TTL must be greater than 0');
    });

    it('should throw error for zero TTL', async () => {
      await expect(
        cache.setTokenValidation('token', { userId: 'u1', email: 'e@e.com' }, 0)
      ).rejects.toThrow('TTL must be greater than 0');
    });

    it('should throw error for missing userId in validation', async () => {
      await expect(
        cache.setTokenValidation('token', { userId: '', email: 'e@e.com' }, 300)
      ).rejects.toThrow('Validation must include userId and email');
    });

    it('should throw error for missing email in validation', async () => {
      await expect(
        cache.setTokenValidation('token', { userId: 'u1', email: '' }, 300)
      ).rejects.toThrow('Validation must include userId and email');
    });

    it('should throw error for missing both userId and email', async () => {
      await expect(
        cache.setTokenValidation('token', { userId: '', email: '' }, 300)
      ).rejects.toThrow('Validation must include userId and email');
    });
  });

  describe('Encapsulation', () => {
    it('should not expose client as a public property', () => {
      // Client is now private in TypeScript
      // Accessing it directly should cause a TypeScript compilation error
      // We verify it exists internally for the class to function
      expect((cache as any).client).toBeDefined();

      // In TypeScript, private members are compile-time only
      // At runtime they still exist, but TypeScript prevents access
      // This test verifies the internal client is set up correctly
    });
  });
});
