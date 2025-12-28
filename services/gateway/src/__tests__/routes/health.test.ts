// services/gateway/src/__tests__/routes/health.test.ts
import request from 'supertest';
import express, { Express } from 'express';
import { createHealthRouter } from '../../routes/health';
import { ImmichClient } from '../../clients/immich';
import { GroupingClient } from '../../clients/grouping';
import { DeduplicationClient } from '../../clients/deduplication';
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

describe('createHealthRouter', () => {
  let app: Express;
  let mockImmichClient: jest.Mocked<ImmichClient>;
  let mockGroupingClient: jest.Mocked<GroupingClient>;
  let mockDeduplicationClient: jest.Mocked<DeduplicationClient>;
  let mockRedisCache: jest.Mocked<RedisCache>;

  beforeEach(() => {
    // Create mock clients
    mockImmichClient = {
      validateToken: jest.fn(),
      getAssets: jest.fn(),
    } as any;

    mockGroupingClient = {
      getGroupsByPaths: jest.fn(),
    } as any;

    mockDeduplicationClient = {
      getDuplicatesByPaths: jest.fn(),
    } as any;

    mockRedisCache = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      setTokenValidation: jest.fn(),
      getTokenValidation: jest.fn(),
    } as any;

    // Create Express app with the router
    app = express();
    const router = createHealthRouter(
      mockImmichClient,
      mockGroupingClient,
      mockDeduplicationClient,
      mockRedisCache
    );
    app.use('/health', router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    describe('Success Cases', () => {
      it('should return 200 with all services healthy', async () => {
        // Mock successful validation for Immich
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });

        // Mock successful calls for grouping and deduplication
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);

        // Mock successful Redis get
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('services');
        expect(response.body.services).toHaveProperty('immich');
        expect(response.body.services).toHaveProperty('grouping');
        expect(response.body.services).toHaveProperty('deduplication');
        expect(response.body.services).toHaveProperty('redis');

        // Verify all services are up
        expect(response.body.services.immich.status).toBe('up');
        expect(response.body.services.grouping.status).toBe('up');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('up');

        // Verify latency is present for HTTP services
        expect(response.body.services.immich).toHaveProperty('latency');
        expect(response.body.services.grouping).toHaveProperty('latency');
        expect(response.body.services.deduplication).toHaveProperty('latency');

        // Verify latency is a non-negative number
        expect(response.body.services.immich.latency).toBeGreaterThanOrEqual(0);
        expect(response.body.services.grouping.latency).toBeGreaterThanOrEqual(0);
        expect(response.body.services.deduplication.latency).toBeGreaterThanOrEqual(0);
      });

      it('should measure latency for each service', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        // Latency should be measured (non-negative numbers)
        expect(typeof response.body.services.immich.latency).toBe('number');
        expect(typeof response.body.services.grouping.latency).toBe('number');
        expect(typeof response.body.services.deduplication.latency).toBe('number');

        expect(response.body.services.immich.latency).toBeGreaterThanOrEqual(0);
        expect(response.body.services.grouping.latency).toBeGreaterThanOrEqual(0);
        expect(response.body.services.deduplication.latency).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Service Failure Cases', () => {
      it('should mark Immich as down when health check fails', async () => {
        mockImmichClient.validateToken.mockRejectedValueOnce(
          new Error('Connection refused')
        );
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.immich).toHaveProperty('error');
        expect(response.body.services.grouping.status).toBe('up');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('up');
      });

      it('should mark grouping service as down when health check fails', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce(
          new Error('Service unavailable')
        );
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('up');
        expect(response.body.services.grouping.status).toBe('down');
        expect(response.body.services.grouping).toHaveProperty('error');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('up');
      });

      it('should mark deduplication service as down when health check fails', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockRejectedValueOnce(
          new Error('Timeout')
        );
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('up');
        expect(response.body.services.grouping.status).toBe('up');
        expect(response.body.services.deduplication.status).toBe('down');
        expect(response.body.services.deduplication).toHaveProperty('error');
        expect(response.body.services.redis.status).toBe('up');
      });

      it('should mark Redis as down when health check fails', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockRejectedValueOnce(
          new Error('Redis connection lost')
        );

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('up');
        expect(response.body.services.grouping.status).toBe('up');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('down');
        expect(response.body.services.redis).toHaveProperty('error');
      });

      it('should mark all services as down when all health checks fail', async () => {
        mockImmichClient.validateToken.mockRejectedValueOnce(new Error('Immich down'));
        mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce(new Error('Grouping down'));
        mockDeduplicationClient.getDuplicatesByPaths.mockRejectedValueOnce(
          new Error('Deduplication down')
        );
        mockRedisCache.getTokenValidation.mockRejectedValueOnce(new Error('Redis down'));

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.grouping.status).toBe('down');
        expect(response.body.services.deduplication.status).toBe('down');
        expect(response.body.services.redis.status).toBe('down');

        // All services should have error messages
        expect(response.body.services.immich).toHaveProperty('error');
        expect(response.body.services.grouping).toHaveProperty('error');
        expect(response.body.services.deduplication).toHaveProperty('error');
        expect(response.body.services.redis).toHaveProperty('error');
      });

      it('should handle multiple service failures', async () => {
        mockImmichClient.validateToken.mockRejectedValueOnce(new Error('Immich error'));
        mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce(new Error('Grouping error'));
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.grouping.status).toBe('down');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('up');
      });
    });

    describe('Edge Cases', () => {
      it('should handle timeout errors gracefully', async () => {
        mockImmichClient.validateToken.mockRejectedValueOnce(
          new Error('Token validation failed: Request timeout')
        );
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.immich.error).toContain('timeout');
      });

      it('should handle non-Error exceptions from Immich', async () => {
        mockImmichClient.validateToken.mockRejectedValueOnce('string error');
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.immich.error).toBe('string error');
      });

      it('should handle non-Error exceptions from grouping', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce('string error');
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.grouping.status).toBe('down');
        expect(response.body.services.grouping.error).toBe('string error');
      });

      it('should handle non-Error exceptions from deduplication', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockRejectedValueOnce(12345);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.deduplication.status).toBe('down');
        expect(response.body.services.deduplication.error).toBe('12345');
      });

      it('should handle non-Error exceptions from Redis', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockRejectedValueOnce({ error: 'object error' });

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.redis.status).toBe('down');
        expect(response.body.services.redis.error).toBe('[object Object]');
      });

      it('should complete health checks even if some are slow', async () => {
        // Simulate a slow Immich response
        mockImmichClient.validateToken.mockImplementation(
          () => new Promise((resolve) =>
            setTimeout(() => resolve({ userId: 'health-check', email: 'health@check.com' }), 100)
          )
        );
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('ok');
        expect(response.body.services.immich.status).toBe('up');
        expect(response.body.services.immich.latency).toBeGreaterThan(50);
      });
    });

    describe('Response Structure', () => {
      it('should return correct response structure', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        // Verify top-level structure
        expect(response.body).toEqual({
          status: 'ok',
          services: {
            immich: {
              status: 'up',
              latency: expect.any(Number),
            },
            grouping: {
              status: 'up',
              latency: expect.any(Number),
            },
            deduplication: {
              status: 'up',
              latency: expect.any(Number),
            },
            redis: {
              status: 'up',
            },
          },
        });
      });

      it('should include error messages when services are down', async () => {
        const immichError = new Error('Immich connection failed');
        mockImmichClient.validateToken.mockRejectedValueOnce(immichError);
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.services.immich).toEqual({
          status: 'down',
          error: 'Immich connection failed',
        });
      });

      it('should not include latency when service is down', async () => {
        mockImmichClient.validateToken.mockRejectedValueOnce(new Error('Down'));
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.services.immich).not.toHaveProperty('latency');
        expect(response.body.services.immich.status).toBe('down');
      });
    });

    describe('Health Check Logic', () => {
      it('should use a health check token for Immich validation', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        await request(app)
          .get('/health')
          .expect(200);

        // Verify that validateToken was called with a health check token
        expect(mockImmichClient.validateToken).toHaveBeenCalledWith('health-check-token');
      });

      it('should use health check paths for grouping service', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        await request(app)
          .get('/health')
          .expect(200);

        // Verify that getGroupsByPaths was called with a health check path
        expect(mockGroupingClient.getGroupsByPaths).toHaveBeenCalledWith(['health-check']);
      });

      it('should use health check paths for deduplication service', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        await request(app)
          .get('/health')
          .expect(200);

        // Verify that getDuplicatesByPaths was called with a health check path
        expect(mockDeduplicationClient.getDuplicatesByPaths).toHaveBeenCalledWith(['health-check']);
      });

      it('should use health check token for Redis validation', async () => {
        mockImmichClient.validateToken.mockResolvedValueOnce({
          userId: 'health-check',
          email: 'health@check.com',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        await request(app)
          .get('/health')
          .expect(200);

        // Verify that getTokenValidation was called with a health check token
        expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('health-check-token');
      });
    });
  });
});
