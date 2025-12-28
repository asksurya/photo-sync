// services/gateway/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AxiosError } from 'axios';
import { createLogger, format, transports, Logger } from 'winston';

const logger: Logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()],
});

/**
 * Type guard to check if an error is an AxiosError
 */
function isAxiosError(error: any): error is AxiosError {
  return error && error.isAxiosError === true;
}

/**
 * Maps HTTP status codes to error codes
 */
export function getErrorCode(status: number): string {
  const errorCodeMap: Record<number, string> = {
    400: 'bad_request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    500: 'internal_error',
    503: 'service_unavailable',
  };

  return errorCodeMap[status] || 'unknown_error';
}

/**
 * Express error handler middleware that provides consistent error responses
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Handle axios errors specially
  if (isAxiosError(error)) {
    // Network errors (no response) - service unavailable
    if (!error.response) {
      logger.error('Backend service unavailable', {
        message: error.message,
        code: error.code,
        path: req.path,
        method: req.method,
      });

      res.status(503).json({
        error: 'service_unavailable',
        message: 'Backend service unavailable',
      });
      return;
    }

    // Backend errors (has response) - pass through status code
    const status = error.response.status;

    // Validate status is a valid number
    if (typeof status === 'number' && !isNaN(status)) {
      const errorCode = getErrorCode(status);

      logger.error('Backend error response', {
        status,
        errorCode,
        message: error.message,
        path: req.path,
        method: req.method,
      });

      res.status(status).json({
        error: errorCode,
        message: error.message,
      });
      return;
    }
  }

  // Handle generic errors - 500 internal error
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String(error.message);
  } else {
    message = String(error);
  }

  logger.error('Internal error', {
    message,
    error: error instanceof Error ? error.stack : undefined,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'internal_error',
    message,
  });
}
