// services/gateway/src/middleware/logging.ts
import { Request, Response, NextFunction } from 'express';
import { createLogger, format, transports, Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

const logger: Logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()],
});

// Augment Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Logging middleware that logs HTTP requests and responses with timing information
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique requestId
  const requestId = uuidv4();
  req.requestId = requestId;

  // Record start time
  const startTime = Date.now();

  // Register finish event listener
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  // Call next immediately to not block request
  next();
}
