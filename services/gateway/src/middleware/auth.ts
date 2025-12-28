// services/gateway/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { ImmichClient, TokenValidation } from '../clients/immich';
import { RedisCache } from '../services/redis';
import { createLogger, format, transports, Logger } from 'winston';

const TOKEN_CACHE_TTL_SECONDS = 300;

// Augment Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenValidation;
    }
  }
}

export function createAuthMiddleware(
  immichClient: ImmichClient,
  redisCache: RedisCache
) {
  const logger: Logger = createLogger({
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: [new transports.Console()],
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Step 1: Check for Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || authHeader.trim().length === 0) {
        logger.warn('Missing Authorization header');
        res.status(401).json({
          error: 'unauthorized',
          message: 'Missing Authorization header',
        });
        return;
      }

      // Step 2: Validate header format (check for Bearer prefix)
      // Trim leading/trailing whitespace from header but preserve internal whitespace
      const trimmedHeader = authHeader.trim();

      if (!trimmedHeader.toLowerCase().startsWith('bearer ')) {
        logger.warn('Invalid Authorization header format', { header: authHeader });
        res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid Authorization header format',
        });
        return;
      }

      // Step 3: Extract token (remove "Bearer " prefix and trim whitespace)
      const token = trimmedHeader.substring(7).trim(); // 7 = length of "Bearer "

      // Note: token.length === 0 check is not needed here because:
      // - If header is "Bearer" (no space), it fails the startsWith('bearer ') check above
      // - If header is "Bearer " or "Bearer   ", trim() makes it "Bearer", which also fails above
      // - So if we reach here, trimmedHeader must be at least "Bearer X", giving us a token

      // Step 4: Check Redis cache first
      let validation: TokenValidation | null = null;
      let cacheHit = false;

      try {
        validation = await redisCache.getTokenValidation(token);
        if (validation) {
          cacheHit = true;
          logger.debug('Token validation retrieved from cache');
        }
      } catch (cacheError) {
        // Log cache error but continue to Immich validation
        logger.warn('Redis cache read failed, falling back to Immich validation', {
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      // Step 5: If cache miss, validate with Immich
      if (!validation) {
        try {
          validation = await immichClient.validateToken(token);
          logger.debug('Token validated with Immich');

          // Step 6: Cache the validation result (non-blocking)
          try {
            await redisCache.setTokenValidation(token, validation, TOKEN_CACHE_TTL_SECONDS);
            logger.debug('Token validation cached successfully');
          } catch (setCacheError) {
            // Log but don't fail the request if caching fails
            logger.warn('Failed to cache token validation', {
              error: setCacheError instanceof Error ? setCacheError.message : String(setCacheError),
            });
          }
        } catch (validationError) {
          // Step 7: Handle validation failure
          logger.error('Token validation failed', {
            error: validationError instanceof Error ? validationError.message : String(validationError),
          });

          res.status(401).json({
            error: 'invalid_token',
            message: validationError instanceof Error
              ? validationError.message
              : 'Token validation failed',
          });
          return;
        }
      }

      // Step 8: Attach user info to request and proceed
      req.user = validation;
      logger.debug('User authenticated successfully', {
        userId: validation.userId,
        cacheHit,
      });

      next();
    } catch (error) {
      // Catch-all for unexpected errors
      logger.error('Unexpected error in auth middleware', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(401).json({
        error: 'invalid_token',
        message: 'Token validation failed',
      });
    }
  };
}
