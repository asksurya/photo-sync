// services/gateway/src/__tests__/routes/proxy.test.ts
import express, { Express } from 'express';
import { createProxyRouter, ProxyConfig } from '../../routes/proxy';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

// Mock http-proxy-middleware
jest.mock('http-proxy-middleware');

describe('createProxyRouter', () => {
  let app: Express;
  let mockCreateProxyMiddleware: jest.MockedFunction<typeof createProxyMiddleware>;
  let mockProxyConfig: ProxyConfig;

  beforeEach(() => {
    // Get the mocked function
    mockCreateProxyMiddleware = createProxyMiddleware as jest.MockedFunction<typeof createProxyMiddleware>;

    // Create mock proxy middleware that simply returns a mock function
    mockCreateProxyMiddleware.mockImplementation(() => {
      return jest.fn((req, res, next) => {
        next();
      }) as any;
    });

    // Create proxy config
    mockProxyConfig = {
      immichUrl: 'http://immich:3001',
      groupingUrl: 'http://grouping:3002',
      deduplicationUrl: 'http://deduplication:3003',
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Router Creation', () => {
    it('should create a router with all proxy routes', () => {
      const router = createProxyRouter(mockProxyConfig);

      expect(router).toBeDefined();
      expect(typeof router).toBe('function');
    });

    it('should create proxy middleware for all three services', () => {
      createProxyRouter(mockProxyConfig);

      // Verify that createProxyMiddleware was called 3 times
      expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(3);
    });
  });

  describe('Immich Proxy Configuration', () => {
    it('should configure Immich proxy with correct target and path rewrite', () => {
      createProxyRouter(mockProxyConfig);

      // Find the call for Immich proxy (should be first call)
      const immichCall = mockCreateProxyMiddleware.mock.calls[0];
      expect(immichCall).toBeDefined();

      const immichConfig = immichCall[0] as Options;
      expect(immichConfig.target).toBe('http://immich:3001');
      expect(immichConfig.changeOrigin).toBe(true);

      // Verify path rewrite function exists
      expect(immichConfig.pathRewrite).toBeDefined();
      expect(typeof immichConfig.pathRewrite).toBe('object');

      // Test path rewrite
      const pathRewrite = immichConfig.pathRewrite as Record<string, string>;
      expect(pathRewrite['^/api/immich']).toBe('/api');
    });

    it('should rewrite /api/immich paths to /api', () => {
      createProxyRouter(mockProxyConfig);

      const immichCall = mockCreateProxyMiddleware.mock.calls[0];
      const immichConfig = immichCall[0] as Options;
      const pathRewrite = immichConfig.pathRewrite as Record<string, string>;

      // The regex pattern should match
      const pattern = Object.keys(pathRewrite)[0];
      expect(pattern).toBe('^/api/immich');
      expect(pathRewrite[pattern]).toBe('/api');
    });

    it('should set changeOrigin to true for Immich proxy', () => {
      createProxyRouter(mockProxyConfig);

      const immichCall = mockCreateProxyMiddleware.mock.calls[0];
      const immichConfig = immichCall[0] as Options;

      expect(immichConfig.changeOrigin).toBe(true);
    });
  });

  describe('Grouping Proxy Configuration', () => {
    it('should configure Grouping proxy with correct target', () => {
      createProxyRouter(mockProxyConfig);

      // Find the call for Grouping proxy (should be second call)
      const groupingCall = mockCreateProxyMiddleware.mock.calls[1];
      expect(groupingCall).toBeDefined();

      const groupingConfig = groupingCall[0] as Options;
      expect(groupingConfig.target).toBe('http://grouping:3002');
      expect(groupingConfig.changeOrigin).toBe(true);
    });

    it('should set changeOrigin to true for Grouping proxy', () => {
      createProxyRouter(mockProxyConfig);

      const groupingCall = mockCreateProxyMiddleware.mock.calls[1];
      const groupingConfig = groupingCall[0] as Options;

      expect(groupingConfig.changeOrigin).toBe(true);
    });

    it('should not have path rewrite for Grouping proxy', () => {
      createProxyRouter(mockProxyConfig);

      const groupingCall = mockCreateProxyMiddleware.mock.calls[1];
      const groupingConfig = groupingCall[0] as Options;

      expect(groupingConfig.pathRewrite).toBeUndefined();
    });
  });

  describe('Deduplication Proxy Configuration', () => {
    it('should configure Deduplication proxy with correct target', () => {
      createProxyRouter(mockProxyConfig);

      // Find the call for Deduplication proxy (should be third call)
      const deduplicationCall = mockCreateProxyMiddleware.mock.calls[2];
      expect(deduplicationCall).toBeDefined();

      const deduplicationConfig = deduplicationCall[0] as Options;
      expect(deduplicationConfig.target).toBe('http://deduplication:3003');
      expect(deduplicationConfig.changeOrigin).toBe(true);
    });

    it('should set changeOrigin to true for Deduplication proxy', () => {
      createProxyRouter(mockProxyConfig);

      const deduplicationCall = mockCreateProxyMiddleware.mock.calls[2];
      const deduplicationConfig = deduplicationCall[0] as Options;

      expect(deduplicationConfig.changeOrigin).toBe(true);
    });

    it('should not have path rewrite for Deduplication proxy', () => {
      createProxyRouter(mockProxyConfig);

      const deduplicationCall = mockCreateProxyMiddleware.mock.calls[2];
      const deduplicationConfig = deduplicationCall[0] as Options;

      expect(deduplicationConfig.pathRewrite).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with trailing slashes', () => {
      const configWithTrailingSlashes: ProxyConfig = {
        immichUrl: 'http://immich:3001/',
        groupingUrl: 'http://grouping:3002/',
        deduplicationUrl: 'http://deduplication:3003/',
      };

      createProxyRouter(configWithTrailingSlashes);

      expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(3);

      const immichCall = mockCreateProxyMiddleware.mock.calls[0];
      const groupingCall = mockCreateProxyMiddleware.mock.calls[1];
      const deduplicationCall = mockCreateProxyMiddleware.mock.calls[2];

      expect((immichCall[0] as Options).target).toBe('http://immich:3001/');
      expect((groupingCall[0] as Options).target).toBe('http://grouping:3002/');
      expect((deduplicationCall[0] as Options).target).toBe('http://deduplication:3003/');
    });

    it('should handle URLs with different protocols', () => {
      const configWithHttps: ProxyConfig = {
        immichUrl: 'https://immich.example.com',
        groupingUrl: 'https://grouping.example.com',
        deduplicationUrl: 'https://deduplication.example.com',
      };

      createProxyRouter(configWithHttps);

      const immichCall = mockCreateProxyMiddleware.mock.calls[0];
      const groupingCall = mockCreateProxyMiddleware.mock.calls[1];
      const deduplicationCall = mockCreateProxyMiddleware.mock.calls[2];

      expect((immichCall[0] as Options).target).toBe('https://immich.example.com');
      expect((groupingCall[0] as Options).target).toBe('https://grouping.example.com');
      expect((deduplicationCall[0] as Options).target).toBe('https://deduplication.example.com');
    });

    it('should handle localhost URLs', () => {
      const configWithLocalhost: ProxyConfig = {
        immichUrl: 'http://localhost:3001',
        groupingUrl: 'http://localhost:3002',
        deduplicationUrl: 'http://localhost:3003',
      };

      createProxyRouter(configWithLocalhost);

      const immichCall = mockCreateProxyMiddleware.mock.calls[0];
      const groupingCall = mockCreateProxyMiddleware.mock.calls[1];
      const deduplicationCall = mockCreateProxyMiddleware.mock.calls[2];

      expect((immichCall[0] as Options).target).toBe('http://localhost:3001');
      expect((groupingCall[0] as Options).target).toBe('http://localhost:3002');
      expect((deduplicationCall[0] as Options).target).toBe('http://localhost:3003');
    });

    it('should create independent proxy instances', () => {
      createProxyRouter(mockProxyConfig);

      // Each proxy should be a separate middleware instance
      const immichProxy = mockCreateProxyMiddleware.mock.results[0].value;
      const groupingProxy = mockCreateProxyMiddleware.mock.results[1].value;
      const deduplicationProxy = mockCreateProxyMiddleware.mock.results[2].value;

      expect(immichProxy).not.toBe(groupingProxy);
      expect(groupingProxy).not.toBe(deduplicationProxy);
      expect(immichProxy).not.toBe(deduplicationProxy);
    });
  });

  describe('Configuration Type Safety', () => {
    it('should accept valid ProxyConfig', () => {
      const validConfig: ProxyConfig = {
        immichUrl: 'http://immich:3001',
        groupingUrl: 'http://grouping:3002',
        deduplicationUrl: 'http://deduplication:3003',
      };

      const router = createProxyRouter(validConfig);
      expect(router).toBeDefined();
    });

    it('should require all three URL properties', () => {
      // This test verifies TypeScript compilation
      // If ProxyConfig interface is correctly defined, this will compile
      const config: ProxyConfig = {
        immichUrl: 'http://immich:3001',
        groupingUrl: 'http://grouping:3002',
        deduplicationUrl: 'http://deduplication:3003',
      };

      expect(config.immichUrl).toBeDefined();
      expect(config.groupingUrl).toBeDefined();
      expect(config.deduplicationUrl).toBeDefined();
    });
  });

  describe('Router Mounting', () => {
    it('should mount router successfully in Express app', () => {
      const app = express();
      const router = createProxyRouter(mockProxyConfig);

      expect(() => {
        app.use('/api', router);
      }).not.toThrow();
    });

    it('should support multiple router instances with different configs', () => {
      const config1: ProxyConfig = {
        immichUrl: 'http://immich1:3001',
        groupingUrl: 'http://grouping1:3002',
        deduplicationUrl: 'http://deduplication1:3003',
      };

      const config2: ProxyConfig = {
        immichUrl: 'http://immich2:3001',
        groupingUrl: 'http://grouping2:3002',
        deduplicationUrl: 'http://deduplication2:3003',
      };

      const router1 = createProxyRouter(config1);
      const router2 = createProxyRouter(config2);

      expect(router1).toBeDefined();
      expect(router2).toBeDefined();
      expect(router1).not.toBe(router2);
    });
  });
});
