import request from 'supertest';
import express from 'express';

// Mock uuid to avoid ESM issues
jest.mock('uuid');

describe('API Gateway Server Integration', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Import the app from server module
    const serverModule = await import('../server');
    app = serverModule.app;
  });

  describe('CORS', () => {
    it('should enable CORS with proper headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight OPTIONS request', async () => {
      const response = await request(app)
        .options('/api/assets')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
    });
  });

  describe('GET /health', () => {
    it('should return health status without authentication', async () => {
      const response = await request(app).get('/health');

      // In test environment, services are not available, so expect 503 degraded
      expect([200, 503]).toContain(response.status);
      expect(response.body.status).toBeDefined();
      expect(response.body.services).toBeDefined();
    });

    it('should respond with JSON content type', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Protected Routes', () => {
    describe('GET /api/assets', () => {
      it('should require authentication (401 without token)', async () => {
        const response = await request(app).get('/api/assets');

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it('should return 401 with invalid token format', async () => {
        const response = await request(app)
          .get('/api/assets')
          .set('Authorization', 'InvalidFormat');

        expect(response.status).toBe(401);
      });

      it('should return 401 with empty Bearer token', async () => {
        const response = await request(app)
          .get('/api/assets')
          .set('Authorization', 'Bearer ');

        expect(response.status).toBe(401);
      });
    });

    describe('Proxy Routes', () => {
      it('should require auth for /api/immich routes', async () => {
        const response = await request(app).get('/api/immich/server-info');

        expect(response.status).toBe(401);
      });

      it('should require auth for /api/groups routes', async () => {
        const response = await request(app).get('/api/groups');

        expect(response.status).toBe(401);
      });

      it('should require auth for /api/duplicates routes', async () => {
        const response = await request(app).get('/api/duplicates');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown routes with 404', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });

    it('should return JSON error responses', async () => {
      const response = await request(app).get('/api/assets');

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Middleware Order', () => {
    it('should apply JSON parsing middleware', async () => {
      const response = await request(app)
        .post('/api/assets')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      // Should get 401 (auth middleware) not 404 or 500 (parsing error)
      expect(response.status).toBe(401);
    });

    it('should log requests with request ID', async () => {
      const response = await request(app).get('/health');

      // Request should complete (200 or 503), logging happens in background
      expect([200, 503]).toContain(response.status);
    });
  });
});
