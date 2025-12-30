// services/gateway/src/routes/assets.ts
import { Router, Request, Response, NextFunction } from 'express';
import { ImmichClient } from '../clients/immich';
import { EnrichmentService } from '../services/enrichment';
import { createLogger, format, transports, Logger } from 'winston';

export function createAssetsRouter(
  immichClient: ImmichClient,
  enrichmentService: EnrichmentService
): Router {
  const router = Router();
  const logger: Logger = createLogger({
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: [new transports.Console()],
  });

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract and validate Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || authHeader.trim().length === 0) {
        logger.warn('Missing Authorization header');
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Missing Authorization header',
        });
      }

      // Validate Bearer token format
      const parts = authHeader.trim().split(/\s+/);
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        logger.warn('Invalid Authorization header format');
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid Authorization header format',
        });
      }

      const token = parts[1].trim();
      if (token.length === 0) {
        logger.warn('Empty token in Authorization header');
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid Authorization header format',
        });
      }

      // Parse and validate query parameters
      const skipParam = req.query.skip as string | undefined;
      const limitParam = req.query.limit as string | undefined;

      // Parse skip with default value of 0
      let skip = 0;
      if (skipParam !== undefined) {
        const parsedSkip = Number(skipParam);
        if (isNaN(parsedSkip)) {
          logger.warn('Invalid skip parameter', { skip: skipParam });
          return res.status(400).json({
            error: 'invalid_parameters',
            message: 'Skip must be a valid number',
          });
        }
        skip = Math.floor(parsedSkip);
        if (skip < 0) {
          logger.warn('Negative skip parameter', { skip });
          return res.status(400).json({
            error: 'invalid_parameters',
            message: 'Skip must be non-negative',
          });
        }
      }

      // Parse limit with default value of 100
      let limit = 100;
      if (limitParam !== undefined) {
        const parsedLimit = Number(limitParam);
        if (isNaN(parsedLimit)) {
          logger.warn('Invalid limit parameter', { limit: limitParam });
          return res.status(400).json({
            error: 'invalid_parameters',
            message: 'Limit must be a valid number',
          });
        }
        limit = Math.floor(parsedLimit);
        if (limit <= 0) {
          logger.warn('Non-positive limit parameter', { limit });
          return res.status(400).json({
            error: 'invalid_parameters',
            message: 'Limit must be greater than 0',
          });
        }
      }

      logger.debug('Fetching assets', { skip, limit });

      // Fetch assets from Immich
      const assets = await immichClient.getAssets(token, skip, limit);

      logger.debug('Assets fetched, enriching', { count: assets.length });

      // Enrich assets with grouping/deduplication metadata
      const enrichedAssets = await enrichmentService.enrichAssets(assets);

      logger.info('Assets enriched successfully', { count: enrichedAssets.length });

      // Return enriched assets
      res.json({ assets: enrichedAssets });
    } catch (error) {
      // Check if error is a service unavailable error
      if (error instanceof Error && error.message.includes('Service unavailable')) {
        logger.error('Service unavailable', { error: error.message });
        return next(error);
      }

      // Pass all other errors to the error handler
      logger.error('Error in assets route', { error });
      next(error);
    }
  });

  router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract and validate Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || authHeader.trim().length === 0) {
        logger.warn('Missing Authorization header');
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Missing Authorization header',
        });
      }

      // Validate Bearer token format
      const parts = authHeader.trim().split(/\s+/);
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        logger.warn('Invalid Authorization header format');
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid Authorization header format',
        });
      }

      const token = parts[1].trim();
      if (token.length === 0) {
        logger.warn('Empty token in Authorization header');
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid Authorization header format',
        });
      }

      // Validate request body
      const { assetIds } = req.body;

      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        logger.warn('Invalid assetIds parameter');
        return res.status(400).json({
          error: 'invalid_parameters',
          message: 'assetIds must be a non-empty array',
        });
      }

      // Validate all IDs are strings
      if (!assetIds.every((id: any) => typeof id === 'string' && id.length > 0)) {
        logger.warn('Invalid asset ID in array');
        return res.status(400).json({
          error: 'invalid_parameters',
          message: 'All asset IDs must be non-empty strings',
        });
      }

      logger.info('Deleting assets', { count: assetIds.length, ids: assetIds });

      // Delete assets from Immich
      await immichClient.deleteAssets(token, assetIds);

      logger.info('Assets deleted successfully', { count: assetIds.length });

      // Return success response
      res.json({
        success: true,
        deletedCount: assetIds.length
      });
    } catch (error) {
      // Pass all errors to the error handler
      logger.error('Error in delete assets route', { error });
      next(error);
    }
  });

  return router;
}
