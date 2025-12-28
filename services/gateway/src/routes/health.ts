// services/gateway/src/routes/health.ts
import { Router, Request, Response } from 'express';
import { ImmichClient } from '../clients/immich';
import { GroupingClient } from '../clients/grouping';
import { DeduplicationClient } from '../clients/deduplication';
import { RedisCache } from '../services/redis';
import { createLogger, format, transports, Logger } from 'winston';

const HEALTH_CHECK_TOKEN = 'health-check-token';
const HEALTH_CHECK_PATH = 'health-check';

interface ServiceStatus {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  services: {
    immich: ServiceStatus;
    grouping: ServiceStatus;
    deduplication: ServiceStatus;
    redis: ServiceStatus;
  };
}

export function createHealthRouter(
  immichClient: ImmichClient,
  groupingClient: GroupingClient,
  deduplicationClient: DeduplicationClient,
  redisCache: RedisCache
): Router {
  const router = Router();
  const logger: Logger = createLogger({
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: [new transports.Console()],
  });

  router.get('/', async (req: Request, res: Response) => {
    logger.debug('Health check requested');

    // Check all services in parallel
    const [immichHealth, groupingHealth, deduplicationHealth, redisHealth] = await Promise.all([
      checkImmichHealth(immichClient),
      checkGroupingHealth(groupingClient),
      checkDeduplicationHealth(deduplicationClient),
      checkRedisHealth(redisCache),
    ]);

    // Determine overall status
    const allServicesUp =
      immichHealth.status === 'up' &&
      groupingHealth.status === 'up' &&
      deduplicationHealth.status === 'up' &&
      redisHealth.status === 'up';

    const response: HealthResponse = {
      status: allServicesUp ? 'ok' : 'degraded',
      services: {
        immich: immichHealth,
        grouping: groupingHealth,
        deduplication: deduplicationHealth,
        redis: redisHealth,
      },
    };

    logger.info('Health check completed', { status: response.status });

    res.status(200).json(response);
  });

  return router;
}

async function checkImmichHealth(client: ImmichClient): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    await client.validateToken(HEALTH_CHECK_TOKEN);
    const latency = Date.now() - startTime;

    return {
      status: 'up',
      latency,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkGroupingHealth(client: GroupingClient): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    await client.getGroupsByPaths([HEALTH_CHECK_PATH]);
    const latency = Date.now() - startTime;

    return {
      status: 'up',
      latency,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkDeduplicationHealth(client: DeduplicationClient): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    await client.getDuplicatesByPaths([HEALTH_CHECK_PATH]);
    const latency = Date.now() - startTime;

    return {
      status: 'up',
      latency,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkRedisHealth(cache: RedisCache): Promise<ServiceStatus> {
  try {
    await cache.getTokenValidation(HEALTH_CHECK_TOKEN);

    return {
      status: 'up',
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
