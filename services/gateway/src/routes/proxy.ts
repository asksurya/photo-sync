// services/gateway/src/routes/proxy.ts
import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

export interface ProxyConfig {
  immichUrl: string;
  groupingUrl: string;
  deduplicationUrl: string;
}

export function createProxyRouter(config: ProxyConfig): Router {
  const router = Router();

  // Proxy for Immich service with path rewrite
  // /api/immich/* -> http://immich:3001/api/*
  router.use(
    '/immich',
    createProxyMiddleware({
      target: config.immichUrl,
      changeOrigin: true,
      pathRewrite: {
        '^/api/immich': '/api',
      },
    })
  );

  // Proxy for Grouping service
  // /api/groups/* -> http://grouping:3002/*
  router.use(
    '/groups',
    createProxyMiddleware({
      target: config.groupingUrl,
      changeOrigin: true,
    })
  );

  // Proxy for Deduplication service
  // /api/duplicates/* -> http://deduplication:3003/*
  router.use(
    '/duplicates',
    createProxyMiddleware({
      target: config.deduplicationUrl,
      changeOrigin: true,
    })
  );

  return router;
}
