// services/gateway/src/__tests__/routes/assets.test.ts
import request from 'supertest';
import express, { Express } from 'express';
import { createAssetsRouter } from '../../routes/assets';
import { ImmichClient, Asset } from '../../clients/immich';
import { EnrichmentService, EnrichedAsset } from '../../services/enrichment';

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

describe('createAssetsRouter', () => {
  let app: Express;
  let mockImmichClient: jest.Mocked<ImmichClient>;
  let mockEnrichmentService: jest.Mocked<EnrichmentService>;

  beforeEach(() => {
    // Create mock Immich client
    mockImmichClient = {
      validateToken: jest.fn(),
      getAssets: jest.fn(),
    } as any;

    // Create mock Enrichment service
    mockEnrichmentService = {
      enrichAssets: jest.fn(),
    } as any;

    // Create Express app with the router
    app = express();
    const router = createAssetsRouter(mockImmichClient, mockEnrichmentService);
    app.use('/assets', router);

    // Add error handler middleware
    app.use((err: any, req: any, res: any, next: any) => {
      if (err.message && err.message.includes('Service unavailable')) {
        res.status(503).json({ error: 'service_unavailable', message: err.message });
      } else {
        res.status(500).json({ error: 'internal_error', message: err.message });
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    describe('Success Cases', () => {
      it('should return enriched assets successfully with default pagination', async () => {
        const mockAssets: Asset[] = [
          { id: 'asset-1', type: 'image' },
          { id: 'asset-2', type: 'video' },
        ];

        const mockEnrichedAssets: EnrichedAsset[] = [
          { id: 'asset-1', type: 'image', groupId: 'group-1', groupType: 'burst' },
          { id: 'asset-2', type: 'video', duplicateGroupId: 'dup-1', duplicateType: 'exact' },
        ];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockEnrichedAssets);

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body).toEqual({ assets: mockEnrichedAssets });
        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('valid-token', 0, 100);
        expect(mockEnrichmentService.enrichAssets).toHaveBeenCalledWith(mockAssets);
      });

      it('should return enriched assets with custom skip and limit', async () => {
        const mockAssets: Asset[] = [
          { id: 'asset-3', type: 'image' },
        ];

        const mockEnrichedAssets: EnrichedAsset[] = [
          { id: 'asset-3', type: 'image', groupId: 'group-2', groupType: 'stack' },
        ];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockEnrichedAssets);

        const response = await request(app)
          .get('/assets?skip=10&limit=50')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body).toEqual({ assets: mockEnrichedAssets });
        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('valid-token', 10, 50);
        expect(mockEnrichmentService.enrichAssets).toHaveBeenCalledWith(mockAssets);
      });

      it('should return empty array when no assets are found', async () => {
        mockImmichClient.getAssets.mockResolvedValueOnce([]);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce([]);

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body).toEqual({ assets: [] });
        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('valid-token', 0, 100);
        expect(mockEnrichmentService.enrichAssets).toHaveBeenCalledWith([]);
      });

      it('should handle lowercase "bearer" prefix', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-4', type: 'image' }];
        const mockEnrichedAssets: EnrichedAsset[] = [{ id: 'asset-4', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockEnrichedAssets);

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'bearer lowercase-token')
          .expect(200);

        expect(response.body).toEqual({ assets: mockEnrichedAssets });
        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('lowercase-token', 0, 100);
      });

      it('should trim whitespace from token', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-5', type: 'image' }];
        const mockEnrichedAssets: EnrichedAsset[] = [{ id: 'asset-5', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockEnrichedAssets);

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer   token-with-spaces   ')
          .expect(200);

        expect(response.body).toEqual({ assets: mockEnrichedAssets });
        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('token-with-spaces', 0, 100);
      });
    });

    describe('Authorization Validation', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const response = await request(app)
          .get('/assets')
          .expect(401);

        expect(response.body).toEqual({
          error: 'unauthorized',
          message: 'Missing Authorization header',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
        expect(mockEnrichmentService.enrichAssets).not.toHaveBeenCalled();
      });

      it('should return 401 when Authorization header is empty', async () => {
        const response = await request(app)
          .get('/assets')
          .set('Authorization', '')
          .expect(401);

        expect(response.body).toEqual({
          error: 'unauthorized',
          message: 'Missing Authorization header',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });

      it('should return 401 when Authorization header is whitespace only', async () => {
        const response = await request(app)
          .get('/assets')
          .set('Authorization', '   ')
          .expect(401);

        expect(response.body).toEqual({
          error: 'unauthorized',
          message: 'Missing Authorization header',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });

      it('should return 401 when Authorization header does not start with Bearer', async () => {
        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Basic sometoken')
          .expect(401);

        expect(response.body).toEqual({
          error: 'unauthorized',
          message: 'Invalid Authorization header format',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });

      it('should return 401 when Authorization header has no token after Bearer', async () => {
        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer')
          .expect(401);

        expect(response.body).toEqual({
          error: 'unauthorized',
          message: 'Invalid Authorization header format',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });

      it('should return 401 when Authorization header has only whitespace after Bearer', async () => {
        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer   ')
          .expect(401);

        expect(response.body).toEqual({
          error: 'unauthorized',
          message: 'Invalid Authorization header format',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });
    });

    describe('Query Parameter Validation', () => {
      it('should return 400 when skip is negative', async () => {
        const response = await request(app)
          .get('/assets?skip=-1')
          .set('Authorization', 'Bearer valid-token')
          .expect(400);

        expect(response.body).toEqual({
          error: 'invalid_parameters',
          message: 'Skip must be non-negative',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });

      it('should return 400 when limit is zero', async () => {
        const response = await request(app)
          .get('/assets?limit=0')
          .set('Authorization', 'Bearer valid-token')
          .expect(400);

        expect(response.body).toEqual({
          error: 'invalid_parameters',
          message: 'Limit must be greater than 0',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });

      it('should return 400 when limit is negative', async () => {
        const response = await request(app)
          .get('/assets?limit=-5')
          .set('Authorization', 'Bearer valid-token')
          .expect(400);

        expect(response.body).toEqual({
          error: 'invalid_parameters',
          message: 'Limit must be greater than 0',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });

      it('should return 400 when skip is not a number', async () => {
        const response = await request(app)
          .get('/assets?skip=abc')
          .set('Authorization', 'Bearer valid-token')
          .expect(400);

        expect(response.body).toEqual({
          error: 'invalid_parameters',
          message: 'Skip must be a valid number',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });

      it('should return 400 when limit is not a number', async () => {
        const response = await request(app)
          .get('/assets?limit=xyz')
          .set('Authorization', 'Bearer valid-token')
          .expect(400);

        expect(response.body).toEqual({
          error: 'invalid_parameters',
          message: 'Limit must be a valid number',
        });
        expect(mockImmichClient.getAssets).not.toHaveBeenCalled();
      });

      it('should handle skip=0 as valid', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-6', type: 'image' }];
        const mockEnrichedAssets: EnrichedAsset[] = [{ id: 'asset-6', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockEnrichedAssets);

        const response = await request(app)
          .get('/assets?skip=0')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body).toEqual({ assets: mockEnrichedAssets });
        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('valid-token', 0, 100);
      });

      it('should handle very large skip and limit values', async () => {
        const mockAssets: Asset[] = [];
        const mockEnrichedAssets: EnrichedAsset[] = [];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockEnrichedAssets);

        const response = await request(app)
          .get('/assets?skip=1000000&limit=10000')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body).toEqual({ assets: mockEnrichedAssets });
        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('valid-token', 1000000, 10000);
      });
    });

    describe('Service Error Handling', () => {
      it('should return 503 when enrichment service is unavailable', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-7', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockRejectedValueOnce(
          new Error('Asset enrichment failed: Service unavailable')
        );

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer valid-token')
          .expect(503);

        expect(response.body).toEqual({
          error: 'service_unavailable',
          message: 'Asset enrichment failed: Service unavailable',
        });
        expect(mockImmichClient.getAssets).toHaveBeenCalled();
        expect(mockEnrichmentService.enrichAssets).toHaveBeenCalledWith(mockAssets);
      });

      it('should return 503 when Immich service is unavailable', async () => {
        mockImmichClient.getAssets.mockRejectedValueOnce(
          new Error('Asset fetch failed: Service unavailable')
        );

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer valid-token')
          .expect(503);

        expect(response.body).toEqual({
          error: 'service_unavailable',
          message: 'Asset fetch failed: Service unavailable',
        });
        expect(mockImmichClient.getAssets).toHaveBeenCalled();
        expect(mockEnrichmentService.enrichAssets).not.toHaveBeenCalled();
      });

      it('should pass other Immich errors to error handler', async () => {
        mockImmichClient.getAssets.mockRejectedValueOnce(
          new Error('Asset fetch failed: Invalid token')
        );

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer invalid-token')
          .expect(500);

        expect(response.body).toEqual({
          error: 'internal_error',
          message: 'Asset fetch failed: Invalid token',
        });
        expect(mockImmichClient.getAssets).toHaveBeenCalled();
      });

      it('should pass other enrichment errors to error handler', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-8', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockRejectedValueOnce(
          new Error('Asset enrichment failed: Database error')
        );

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer valid-token')
          .expect(500);

        expect(response.body).toEqual({
          error: 'internal_error',
          message: 'Asset enrichment failed: Database error',
        });
      });

      it('should handle non-Error exceptions from Immich', async () => {
        mockImmichClient.getAssets.mockRejectedValueOnce('string error');

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer valid-token')
          .expect(500);

        expect(response.body.error).toBe('internal_error');
        expect(mockImmichClient.getAssets).toHaveBeenCalled();
      });

      it('should handle non-Error exceptions from enrichment service', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-9', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockRejectedValueOnce('non-error exception');

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer valid-token')
          .expect(500);

        expect(response.body.error).toBe('internal_error');
      });
    });

    describe('Edge Cases', () => {
      it('should preserve token case sensitivity', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-10', type: 'image' }];
        const mockEnrichedAssets: EnrichedAsset[] = [{ id: 'asset-10', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockEnrichedAssets);

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer CaSe-SeNsItIvE-ToKeN')
          .expect(200);

        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('CaSe-SeNsItIvE-ToKeN', 0, 100);
      });

      it('should handle mixed case Bearer prefix', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-11', type: 'image' }];
        const mockEnrichedAssets: EnrichedAsset[] = [{ id: 'asset-11', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockEnrichedAssets);

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'BeArEr mixed-case-token')
          .expect(200);

        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('mixed-case-token', 0, 100);
      });

      it('should handle enrichment returning same assets without enrichment data', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-12', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockAssets);

        const response = await request(app)
          .get('/assets')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body).toEqual({ assets: mockAssets });
      });

      it('should handle decimal skip and limit by parsing as integers', async () => {
        const mockAssets: Asset[] = [{ id: 'asset-13', type: 'image' }];
        const mockEnrichedAssets: EnrichedAsset[] = [{ id: 'asset-13', type: 'image' }];

        mockImmichClient.getAssets.mockResolvedValueOnce(mockAssets);
        mockEnrichmentService.enrichAssets.mockResolvedValueOnce(mockEnrichedAssets);

        const response = await request(app)
          .get('/assets?skip=5.7&limit=10.9')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(mockImmichClient.getAssets).toHaveBeenCalledWith('valid-token', 5, 10);
      });
    });
  });
});
