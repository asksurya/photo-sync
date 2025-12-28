// services/gateway/src/__tests__/middleware/errorHandler.test.ts
import { Request, Response, NextFunction } from 'express';
import { AxiosError } from 'axios';
import { errorHandler, getErrorCode } from '../../middleware/errorHandler';

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
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

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
    };

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Generic Errors', () => {
    it('should return 500 for generic Error', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'internal_error',
        message: 'Something went wrong',
      });
    });

    it('should return 500 for Error with empty message', () => {
      const error = new Error('');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'internal_error',
        message: '',
      });
    });

    it('should handle non-Error objects gracefully', () => {
      const error = 'string error';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'internal_error',
        message: 'string error',
      });
    });

    it('should handle null error', () => {
      const error = null;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'internal_error',
        message: 'null',
      });
    });

    it('should handle undefined error', () => {
      const error = undefined;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'internal_error',
        message: 'undefined',
      });
    });

    it('should handle object error without message', () => {
      const error = { code: 'ERR_SOMETHING' };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'internal_error',
        message: '[object Object]',
      });
    });
  });

  describe('Axios Network Errors (no response)', () => {
    it('should return 503 for axios network error', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Network Error',
        code: 'ECONNREFUSED',
        config: {} as any,
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'service_unavailable',
        message: 'Backend service unavailable',
      });
    });

    it('should return 503 for axios timeout error', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'timeout of 5000ms exceeded',
        code: 'ECONNABORTED',
        config: {} as any,
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'service_unavailable',
        message: 'Backend service unavailable',
      });
    });
  });

  describe('Axios Backend Errors (with response)', () => {
    it('should pass through 400 Bad Request from backend', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Request failed with status code 400',
        code: 'ERR_BAD_REQUEST',
        config: {} as any,
        response: {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
          data: { error: 'Invalid request' },
        },
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'bad_request',
        message: 'Request failed with status code 400',
      });
    });

    it('should pass through 401 Unauthorized from backend', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Request failed with status code 401',
        code: 'ERR_UNAUTHORIZED',
        config: {} as any,
        response: {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: {} as any,
          data: {},
        },
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'unauthorized',
        message: 'Request failed with status code 401',
      });
    });

    it('should pass through 403 Forbidden from backend', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Request failed with status code 403',
        config: {} as any,
        response: {
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config: {} as any,
          data: {},
        },
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'forbidden',
        message: 'Request failed with status code 403',
      });
    });

    it('should pass through 404 Not Found from backend', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Request failed with status code 404',
        config: {} as any,
        response: {
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
          data: {},
        },
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'not_found',
        message: 'Request failed with status code 404',
      });
    });

    it('should pass through 500 Internal Server Error from backend', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Request failed with status code 500',
        config: {} as any,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: {} as any,
          data: {},
        },
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'internal_error',
        message: 'Request failed with status code 500',
      });
    });

    it('should pass through 503 Service Unavailable from backend', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Request failed with status code 503',
        config: {} as any,
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {},
          config: {} as any,
          data: {},
        },
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'service_unavailable',
        message: 'Request failed with status code 503',
      });
    });

    it('should handle unknown status code from backend', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Request failed with status code 418',
        config: {} as any,
        response: {
          status: 418,
          statusText: "I'm a teapot",
          headers: {},
          config: {} as any,
          data: {},
        },
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(418);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'unknown_error',
        message: 'Request failed with status code 418',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle axios error with response but no status', () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Malformed response',
        config: {} as any,
        response: {
          status: undefined as any,
          statusText: '',
          headers: {},
          config: {} as any,
          data: {},
        },
        toJSON: () => ({}),
      };

      errorHandler(error as AxiosError, mockRequest as Request, mockResponse as Response, mockNext);

      // Should fall back to generic error handling
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'internal_error',
        message: 'Malformed response',
      });
    });

    it('should handle axios-like object without isAxiosError flag', () => {
      const error = {
        message: 'Network Error',
        code: 'ECONNREFUSED',
        config: {},
      };

      errorHandler(error as any, mockRequest as Request, mockResponse as Response, mockNext);

      // Should treat as generic error
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'internal_error',
        message: 'Network Error',
      });
    });
  });
});

describe('getErrorCode', () => {
  it('should return "bad_request" for status 400', () => {
    expect(getErrorCode(400)).toBe('bad_request');
  });

  it('should return "unauthorized" for status 401', () => {
    expect(getErrorCode(401)).toBe('unauthorized');
  });

  it('should return "forbidden" for status 403', () => {
    expect(getErrorCode(403)).toBe('forbidden');
  });

  it('should return "not_found" for status 404', () => {
    expect(getErrorCode(404)).toBe('not_found');
  });

  it('should return "internal_error" for status 500', () => {
    expect(getErrorCode(500)).toBe('internal_error');
  });

  it('should return "service_unavailable" for status 503', () => {
    expect(getErrorCode(503)).toBe('service_unavailable');
  });

  it('should return "unknown_error" for unmapped status codes', () => {
    expect(getErrorCode(418)).toBe('unknown_error');
    expect(getErrorCode(429)).toBe('unknown_error');
    expect(getErrorCode(502)).toBe('unknown_error');
    expect(getErrorCode(999)).toBe('unknown_error');
  });

  it('should return "unknown_error" for invalid status codes', () => {
    expect(getErrorCode(0)).toBe('unknown_error');
    expect(getErrorCode(-1)).toBe('unknown_error');
    expect(getErrorCode(NaN)).toBe('unknown_error');
  });
});
