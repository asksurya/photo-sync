/**
 * API Gateway server entry point
 */
import express from 'express';
import cors from 'cors';
import { Config } from './config';
import { RedisCache } from './services/redis';
import { ImmichClient } from './clients/immich';
import { GroupingClient } from './clients/grouping';
import { DeduplicationClient } from './clients/deduplication';
import { EnrichmentService } from './services/enrichment';
import { loggingMiddleware } from './middleware/logging';
import { createAuthMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { createHealthRouter } from './routes/health';
import { createAssetsRouter } from './routes/assets';
import { createProxyRouter } from './routes/proxy';

// Initialize configuration
const config = new Config();

// Initialize clients
const redisCache = new RedisCache(config.redisUrl);
const immichClient = new ImmichClient(config.immichApiUrl);
const groupingClient = new GroupingClient(config.groupingApiUrl);
const deduplicationClient = new DeduplicationClient(config.dedupApiUrl);

// Initialize services
const enrichmentService = new EnrichmentService(groupingClient, deduplicationClient);

// Create Express app
export const app = express();

// Apply middleware in correct order
// 1. CORS - must be first to handle preflight requests
app.use(cors());

// 2. JSON body parser
app.use(express.json());

// 3. Logging middleware
app.use(loggingMiddleware);

// 4. Public routes (no authentication required)
app.use('/health', createHealthRouter(
  immichClient,
  groupingClient,
  deduplicationClient,
  redisCache
));

// 5. Protected routes with authentication
const authMiddleware = createAuthMiddleware(immichClient, redisCache);

// Assets route with enrichment (handles its own token extraction)
app.use('/api/assets', createAssetsRouter(immichClient, enrichmentService));

// Proxy routes for direct service access (pass through to services)
app.use('/api', createProxyRouter({
  immichUrl: config.immichApiUrl,
  groupingUrl: config.groupingApiUrl,
  deduplicationUrl: config.dedupApiUrl,
}));

// 6. Error handler - must be last
app.use(errorHandler);

// Only start server if this file is run directly
if (require.main === module) {
  // Connect to Redis before starting server
  redisCache.connect()
    .then(() => {
      app.listen(config.port, () => {
        console.log(`API Gateway listening on port ${config.port}`);
      });
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}
