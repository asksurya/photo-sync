// services/gateway/src/__tests__/middleware/logging.test.ts
import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock winston with a factory function
const mockInfo = jest.fn();
const mockError = jest.fn();
const mockWarn = jest.fn();
const mockDebug = jest.fn();

jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: mockInfo,
    error: mockError,
    warn: mockWarn,
    debug: mockDebug,
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

// Import after mocking
import { loggingMiddleware } from '../../middleware/logging';

describe('loggingMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response> & EventEmitter;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test/path',
    };

    // Create a real EventEmitter for the response to test event handling
    mockResponse = new EventEmitter() as Partial<Response> & EventEmitter;
    mockResponse.statusCode = 200;

    mockNext = jest.fn();

    // Clear all mock calls
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should call next() immediately', () => {
      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should attach requestId to request object', () => {
      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).requestId).toBe('test-uuid-1234');
    });

    it('should register finish event listener on response', () => {
      const listenersBefore = mockResponse.listenerCount('finish');

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      const listenersAfter = mockResponse.listenerCount('finish');

      expect(listenersAfter).toBe(listenersBefore + 1);
    });
  });

  describe('Logging Behavior', () => {
    it('should log request details when response finishes', () => {
      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response finishing
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      const logCall = mockInfo.mock.calls[0];

      // Check log message
      expect(logCall[0]).toBe('HTTP Request');

      // Check log data
      expect(logCall[1]).toMatchObject({
        requestId: 'test-uuid-1234',
        method: 'GET',
        path: '/test/path',
        statusCode: 200,
      });

      // Check that duration is a number
      expect(typeof logCall[1].duration).toBe('number');
      expect(logCall[1].duration).toBeGreaterThanOrEqual(0);
    });

    it('should log correct status code for different responses', () => {
      mockResponse.statusCode = 404;

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      const logCall = mockInfo.mock.calls[0];

      expect(logCall[1]).toMatchObject({
        statusCode: 404,
      });
    });

    it('should log correct method for POST request', () => {
      mockRequest.method = 'POST';

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      const logCall = mockInfo.mock.calls[0];

      expect(logCall[1]).toMatchObject({
        method: 'POST',
      });
    });

    it('should log correct path for different paths', () => {
      const customRequest: Partial<Request> = {
        method: 'GET',
        path: '/api/v1/users/123',
      };
      const customResponse = new EventEmitter() as Partial<Response> & EventEmitter;
      customResponse.statusCode = 200;

      loggingMiddleware(customRequest as Request, customResponse as Response, mockNext);
      customResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      const logCall = mockInfo.mock.calls[0];

      expect(logCall[1]).toMatchObject({
        path: '/api/v1/users/123',
      });
    });

    it('should calculate duration correctly', (done) => {
      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Wait a bit before finishing to ensure duration > 0
      setTimeout(() => {
        mockResponse.emit('finish');

        expect(mockInfo).toHaveBeenCalledTimes(1);
        const logCall = mockInfo.mock.calls[0];

        // Duration should be at least 5ms (we waited 10ms, but timing can be imprecise)
        expect(logCall[1].duration).toBeGreaterThanOrEqual(5);
        done();
      }, 10);
    });
  });

  describe('Different HTTP Methods', () => {
    it('should log GET request', () => {
      mockRequest.method = 'GET';

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].method).toBe('GET');
    });

    it('should log POST request', () => {
      mockRequest.method = 'POST';

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].method).toBe('POST');
    });

    it('should log PUT request', () => {
      mockRequest.method = 'PUT';

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].method).toBe('PUT');
    });

    it('should log DELETE request', () => {
      mockRequest.method = 'DELETE';

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].method).toBe('DELETE');
    });

    it('should log PATCH request', () => {
      mockRequest.method = 'PATCH';

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].method).toBe('PATCH');
    });
  });

  describe('Different Status Codes', () => {
    it('should log 200 OK status', () => {
      mockResponse.statusCode = 200;

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].statusCode).toBe(200);
    });

    it('should log 201 Created status', () => {
      mockResponse.statusCode = 201;

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].statusCode).toBe(201);
    });

    it('should log 400 Bad Request status', () => {
      mockResponse.statusCode = 400;

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].statusCode).toBe(400);
    });

    it('should log 401 Unauthorized status', () => {
      mockResponse.statusCode = 401;

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].statusCode).toBe(401);
    });

    it('should log 404 Not Found status', () => {
      mockResponse.statusCode = 404;

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].statusCode).toBe(404);
    });

    it('should log 500 Internal Server Error status', () => {
      mockResponse.statusCode = 500;

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].statusCode).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing method gracefully', () => {
      mockRequest.method = undefined;

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].method).toBeUndefined();
    });

    it('should handle missing path gracefully', () => {
      const customRequest: Partial<Request> = {
        method: 'GET',
      };
      const customResponse = new EventEmitter() as Partial<Response> & EventEmitter;
      customResponse.statusCode = 200;

      loggingMiddleware(customRequest as Request, customResponse as Response, mockNext);
      customResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].path).toBeUndefined();
    });

    it('should handle statusCode 0', () => {
      mockResponse.statusCode = 0;

      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo.mock.calls[0][1].statusCode).toBe(0);
    });

    it('should not log if finish event is never emitted', () => {
      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Don't emit finish event
      expect(mockInfo).not.toHaveBeenCalled();
    });

    it('should generate unique requestId for each request', () => {
      const { v4 } = require('uuid');
      (v4 as jest.Mock)
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2');

      const mockRequest1: Partial<Request> = {
        method: 'GET',
        path: '/test1',
      };
      const mockRequest2: Partial<Request> = {
        method: 'GET',
        path: '/test2',
      };

      loggingMiddleware(mockRequest1 as Request, mockResponse as Response, mockNext);
      loggingMiddleware(mockRequest2 as Request, mockResponse as Response, mockNext);

      expect((mockRequest1 as any).requestId).toBe('uuid-1');
      expect((mockRequest2 as any).requestId).toBe('uuid-2');
    });

    it('should log immediately when finish event is emitted', () => {
      loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockInfo).not.toHaveBeenCalled();

      mockResponse.emit('finish');

      expect(mockInfo).toHaveBeenCalledTimes(1);
    });
  });
});
