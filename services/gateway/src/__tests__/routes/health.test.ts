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
      ping: jest.fn(),
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
        // Mock successful ping for Immich
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
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
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
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
      it('should return 503 when status is degraded', async () => {
        mockImmichClient.ping.mockRejectedValueOnce(
          new Error('Connection refused')
        );
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.immich).toHaveProperty('error');
        expect(response.body.services.grouping.status).toBe('up');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('up');
      });

      it('should mark Immich as down when health check fails', async () => {
        mockImmichClient.ping.mockRejectedValueOnce(
          new Error('Connection refused')
        );
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.immich).toHaveProperty('error');
        expect(response.body.services.grouping.status).toBe('up');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('up');
      });

      it('should mark grouping service as down when health check fails', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
        });
        mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce(
          new Error('Service unavailable')
        );
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('up');
        expect(response.body.services.grouping.status).toBe('down');
        expect(response.body.services.grouping).toHaveProperty('error');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('up');
      });

      it('should mark deduplication service as down when health check fails', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockRejectedValueOnce(
          new Error('Timeout')
        );
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('up');
        expect(response.body.services.grouping.status).toBe('up');
        expect(response.body.services.deduplication.status).toBe('down');
        expect(response.body.services.deduplication).toHaveProperty('error');
        expect(response.body.services.redis.status).toBe('up');
      });

      it('should mark Redis as down when health check fails', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockRejectedValueOnce(
          new Error('Redis connection lost')
        );

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('up');
        expect(response.body.services.grouping.status).toBe('up');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('down');
        expect(response.body.services.redis).toHaveProperty('error');
      });

      it('should mark all services as down when all health checks fail', async () => {
        mockImmichClient.ping.mockRejectedValueOnce(new Error('Immich down'));
        mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce(new Error('Grouping down'));
        mockDeduplicationClient.getDuplicatesByPaths.mockRejectedValueOnce(
          new Error('Deduplication down')
        );
        mockRedisCache.getTokenValidation.mockRejectedValueOnce(new Error('Redis down'));

        const response = await request(app)
          .get('/health')
          .expect(503);

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
        mockImmichClient.ping.mockRejectedValueOnce(new Error('Immich error'));
        mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce(new Error('Grouping error'));
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.grouping.status).toBe('down');
        expect(response.body.services.deduplication.status).toBe('up');
        expect(response.body.services.redis.status).toBe('up');
      });
    });

    describe('Edge Cases', () => {
      it('should handle timeout errors gracefully', async () => {
        mockImmichClient.ping.mockRejectedValueOnce(
          new Error('Ping failed: Request timeout')
        );
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.immich.error).toContain('timeout');
      });

      it('should handle non-Error exceptions from Immich', async () => {
        mockImmichClient.ping.mockRejectedValueOnce('string error');
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.immich.error).toBe('string error');
      });

      it('should handle non-Error exceptions from grouping', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
        });
        mockGroupingClient.getGroupsByPaths.mockRejectedValueOnce('string error');
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.grouping.status).toBe('down');
        expect(response.body.services.grouping.error).toBe('string error');
      });

      it('should handle non-Error exceptions from deduplication', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockRejectedValueOnce(12345);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.deduplication.status).toBe('down');
        expect(response.body.services.deduplication.error).toBe('12345');
      });

      it('should handle non-Error exceptions from Redis', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockRejectedValueOnce({ error: 'object error' });

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.redis.status).toBe('down');
        expect(response.body.services.redis.error).toBe('[object Object]');
      });

      it('should complete health checks even if some are slow', async () => {
        // Simulate a slow Immich response
        mockImmichClient.ping.mockImplementation(
          () => new Promise((resolve) =>
            setTimeout(() => resolve({ res: 'pong' }), 100)
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

      it('should timeout health checks after 5 seconds', async () => {
        // Simulate a very slow service that never resolves
        mockImmichClient.ping.mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const startTime = Date.now();
        const response = await request(app)
          .get('/health')
          .expect(503);
        const duration = Date.now() - startTime;

        // Should timeout around 5 seconds (allow some tolerance)
        expect(duration).toBeGreaterThan(4900);
        expect(duration).toBeLessThan(5500);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.immich.status).toBe('down');
        expect(response.body.services.immich.error).toContain('Health check timeout');
      }, 10000); // Increase Jest timeout to 10 seconds
    });

    describe('Response Structure', () => {
      it('should return correct response structure', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
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
        mockImmichClient.ping.mockRejectedValueOnce(immichError);
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.services.immich).toEqual({
          status: 'down',
          error: 'Immich connection failed',
        });
      });

      it('should not include latency when service is down', async () => {
        mockImmichClient.ping.mockRejectedValueOnce(new Error('Down'));
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/health')
          .expect(503);

        expect(response.body.services.immich).not.toHaveProperty('latency');
        expect(response.body.services.immich.status).toBe('down');
      });
    });

    describe('Health Check Logic', () => {
      it('should ping Immich server for health check', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        await request(app)
          .get('/health')
          .expect(200);

        // Verify that ping was called
        expect(mockImmichClient.ping).toHaveBeenCalled();
      });

      it('should use health check paths for grouping service', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
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
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
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

      it('should use health check key for Redis validation', async () => {
        mockImmichClient.ping.mockResolvedValueOnce({
          res: 'pong',
        });
        mockGroupingClient.getGroupsByPaths.mockResolvedValueOnce([]);
        mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValueOnce([]);
        mockRedisCache.getTokenValidation.mockResolvedValueOnce(null);

        await request(app)
          .get('/health')
          .expect(200);

        // Verify that getTokenValidation was called with a health check key
        expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('health-check');
      });
    });
  });
});
