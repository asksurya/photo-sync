import request from 'supertest';
import express from 'express';

describe('API Gateway Server', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Import the app from server module
    const serverModule = await import('../server');
    app = serverModule.app;
  });

  describe('GET /health', () => {
    it('returns 200 OK with correct response', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'api-gateway'
      });
    });

    it('responds with JSON content type', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});
