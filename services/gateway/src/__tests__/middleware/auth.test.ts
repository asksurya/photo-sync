// services/gateway/src/__tests__/middleware/auth.test.ts
import { Request, Response, NextFunction } from 'express';
import { createAuthMiddleware } from '../../middleware/auth';
import { ImmichClient, TokenValidation } from '../../clients/immich';
import { RedisCache } from '../../services/redis';

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

describe('createAuthMiddleware', () => {
  let mockImmichClient: jest.Mocked<ImmichClient>;
  let mockRedisCache: jest.Mocked<RedisCache>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    // Create mock Immich client
    mockImmichClient = {
      validateToken: jest.fn(),
      getAssets: jest.fn(),
    } as any;

    // Create mock Redis cache
    mockRedisCache = {
      getTokenValidation: jest.fn(),
      setTokenValidation: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    // Create mock Express request/response/next
    mockRequest = {
      headers: {},
    };

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Missing Authorization Header', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'unauthorized',
        message: 'Missing Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is empty string', async () => {
      mockRequest.headers = { authorization: '' };
      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'unauthorized',
        message: 'Missing Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is whitespace only', async () => {
      mockRequest.headers = { authorization: '   ' };
      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'unauthorized',
        message: 'Missing Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Malformed Authorization Header', () => {
    it('should return 401 when Authorization header does not start with Bearer', async () => {
      mockRequest.headers = { authorization: 'Basic sometoken' };
      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'unauthorized',
        message: 'Invalid Authorization header format',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header has no token after Bearer', async () => {
      mockRequest.headers = { authorization: 'Bearer' };
      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'unauthorized',
        message: 'Invalid Authorization header format',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header has only whitespace after Bearer', async () => {
      mockRequest.headers = { authorization: 'Bearer   ' };
      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'unauthorized',
        message: 'Invalid Authorization header format',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Cache Hit - Valid Token', () => {
    it('should use cached validation and call next() on cache hit', async () => {
      const cachedValidation: TokenValidation = {
        userId: 'user-123',
        email: 'cached@example.com',
      };

      mockRequest.headers = { authorization: 'Bearer valid-cached-token' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(cachedValidation);

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('valid-cached-token');
      expect(mockImmichClient.validateToken).not.toHaveBeenCalled();
      expect(mockRedisCache.setTokenValidation).not.toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(cachedValidation);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should handle lowercase "bearer" prefix', async () => {
      const cachedValidation: TokenValidation = {
        userId: 'user-456',
        email: 'test@example.com',
      };

      mockRequest.headers = { authorization: 'bearer lowercase-token' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(cachedValidation);

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('lowercase-token');
      expect((mockRequest as any).user).toEqual(cachedValidation);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Cache Miss - Immich Validation', () => {
    it('should validate with Immich and cache result on cache miss', async () => {
      const immichValidation: TokenValidation = {
        userId: 'user-789',
        email: 'immich@example.com',
      };

      mockRequest.headers = { authorization: 'Bearer new-token' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);
      mockImmichClient.validateToken.mockResolvedValueOnce(immichValidation);
      mockRedisCache.setTokenValidation.mockResolvedValueOnce();

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('new-token');
      expect(mockImmichClient.validateToken).toHaveBeenCalledWith('new-token');
      expect(mockRedisCache.setTokenValidation).toHaveBeenCalledWith('new-token', immichValidation, 300);
      expect((mockRequest as any).user).toEqual(immichValidation);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should proceed even if caching fails after successful Immich validation', async () => {
      const immichValidation: TokenValidation = {
        userId: 'user-999',
        email: 'test@example.com',
      };

      mockRequest.headers = { authorization: 'Bearer another-token' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);
      mockImmichClient.validateToken.mockResolvedValueOnce(immichValidation);
      mockRedisCache.setTokenValidation.mockRejectedValueOnce(new Error('Redis write failed'));

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockImmichClient.validateToken).toHaveBeenCalledWith('another-token');
      expect(mockRedisCache.setTokenValidation).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(immichValidation);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should proceed even if caching fails with non-Error exception', async () => {
      const immichValidation: TokenValidation = {
        userId: 'user-1000',
        email: 'test2@example.com',
      };

      mockRequest.headers = { authorization: 'Bearer token-cache-fail' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);
      mockImmichClient.validateToken.mockResolvedValueOnce(immichValidation);
      mockRedisCache.setTokenValidation.mockRejectedValueOnce('non-error exception');

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockImmichClient.validateToken).toHaveBeenCalledWith('token-cache-fail');
      expect(mockRedisCache.setTokenValidation).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(immichValidation);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 when Immich validation fails', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);
      mockImmichClient.validateToken.mockRejectedValueOnce(
        new Error('Token validation failed: Invalid token')
      );

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('invalid-token');
      expect(mockImmichClient.validateToken).toHaveBeenCalledWith('invalid-token');
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'invalid_token',
        message: 'Token validation failed: Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 with generic message for non-Error exceptions', async () => {
      mockRequest.headers = { authorization: 'Bearer bad-token' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);
      mockImmichClient.validateToken.mockRejectedValueOnce('string error');

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'invalid_token',
        message: 'Token validation failed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Redis Cache Errors', () => {
    it('should fall back to Immich validation when Redis read fails', async () => {
      const immichValidation: TokenValidation = {
        userId: 'user-fallback',
        email: 'fallback@example.com',
      };

      mockRequest.headers = { authorization: 'Bearer token-with-redis-error' };
      mockRedisCache.getTokenValidation.mockRejectedValueOnce(new Error('Redis connection failed'));
      mockImmichClient.validateToken.mockResolvedValueOnce(immichValidation);
      mockRedisCache.setTokenValidation.mockResolvedValueOnce();

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('token-with-redis-error');
      expect(mockImmichClient.validateToken).toHaveBeenCalledWith('token-with-redis-error');
      expect((mockRequest as any).user).toEqual(immichValidation);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should trim extra whitespace around token', async () => {
      const cachedValidation: TokenValidation = {
        userId: 'user-trim',
        email: 'trim@example.com',
      };

      mockRequest.headers = { authorization: 'Bearer   token-with-spaces   ' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(cachedValidation);

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('token-with-spaces');
      expect((mockRequest as any).user).toEqual(cachedValidation);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle mixed case Bearer prefix', async () => {
      const cachedValidation: TokenValidation = {
        userId: 'user-mixed',
        email: 'mixed@example.com',
      };

      mockRequest.headers = { authorization: 'BeArEr mixed-case-token' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(cachedValidation);

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('mixed-case-token');
      expect((mockRequest as any).user).toEqual(cachedValidation);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should preserve original token value (case-sensitive)', async () => {
      const cachedValidation: TokenValidation = {
        userId: 'user-case',
        email: 'case@example.com',
      };

      mockRequest.headers = { authorization: 'Bearer CaSe-SeNsItIvE-ToKeN' };
      mockRedisCache.getTokenValidation.mockResolvedValueOnce(cachedValidation);

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Token should be passed exactly as extracted (case-sensitive)
      expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('CaSe-SeNsItIvE-ToKeN');
      expect((mockRequest as any).user).toEqual(cachedValidation);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Unexpected Errors', () => {
    it('should handle unexpected errors in try block with catch-all handler', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      // Create a mock that throws an unexpected error (not from validation)
      mockRedisCache.getTokenValidation.mockImplementationOnce(() => {
        throw new Error('Unexpected Redis error');
      });

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'invalid_token',
        message: 'Token validation failed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions in catch-all handler', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      // Mock throwing a non-Error object
      mockRedisCache.getTokenValidation.mockImplementationOnce(() => {
        throw 'string error';
      });

      const middleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'invalid_token',
        message: 'Token validation failed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
