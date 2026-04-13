/**
 * 🧪 Controller Helpers Test Suite
 * Comprehensive tests for standardized response handling and utilities
 */

const {
  sendResponse,
  responses,
  asyncHandler,
  handleDatabaseError,
  validation,
  createPaginationMeta,
  search,
  transform,
  withPerformanceMonitoring,
  cache
} = require('./controllerHelpers');

// Mock response object
const createMockResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    send: jest.fn(() => res)
  };
  return res;
};

// Mock request object
const createMockRequest = (overrides = {}) => ({
  method: 'GET',
  path: '/api/test',
  query: {},
  params: {},
  body: {},
  ...overrides
});

describe('Controller Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('sendResponse', () => {
    it('should send standardized response with data', () => {
      const res = createMockResponse();
      const testData = { id: 1, name: 'Test' };

      sendResponse(res, 200, true, 'Success', testData);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        timestamp: expect.any(String),
        data: testData
      });
    });

    it('should send response without data when data is null', () => {
      const res = createMockResponse();

      sendResponse(res, 200, true, 'Success', null);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        timestamp: expect.any(String)
      });
    });

    it('should include pagination metadata when provided', () => {
      const res = createMockResponse();
      const pagination = { currentPage: 1, totalPages: 5 };

      sendResponse(res, 200, true, 'Success', null, { pagination });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        timestamp: expect.any(String),
        pagination
      });
    });

    it('should include execution time in development mode', () => {
      process.env.NODE_ENV = 'development';
      const res = createMockResponse();

      sendResponse(res, 200, true, 'Success', null, { executionTime: 250 });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        timestamp: expect.any(String),
        executionTime: '250ms'
      });
    });

    it('should sanitize HTML in messages', () => {
      const res = createMockResponse();

      sendResponse(res, 200, true, '<script>alert("xss")</script>Success', null);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success', // HTML should be stripped
        timestamp: expect.any(String)
      });
    });
  });

  describe('responses helpers', () => {
    let res;

    beforeEach(() => {
      res = createMockResponse();
    });

    it('should send success response', () => {
      const testData = { result: 'success' };
      responses.success(res, 'Operation successful', testData);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Operation successful',
          data: testData
        })
      );
    });

    it('should send created response', () => {
      const newResource = { id: 1, name: 'New Resource' };
      responses.created(res, 'Resource created', newResource);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Resource created',
          data: newResource
        })
      );
    });

    it('should send no content response', () => {
      responses.noContent(res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
    });

    it('should send bad request response with errors', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      responses.badRequest(res, 'Validation failed', errors);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors
        })
      );
    });

    it('should send unauthorized response', () => {
      responses.unauthorized(res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required'
        })
      );
    });

    it('should send forbidden response', () => {
      responses.forbidden(res, 'Access denied');

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied'
        })
      );
    });

    it('should send not found response', () => {
      responses.notFound(res, 'User not found');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User not found'
        })
      );
    });

    it('should send conflict response', () => {
      responses.conflict(res, 'Email already exists');

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email already exists'
        })
      );
    });

    it('should send rate limited response with retry after', () => {
      responses.rateLimited(res, 'Too many requests', 60);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Too many requests',
          retryAfter: 60
        })
      );
    });

    it('should send server error with development details', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Database connection failed');
      error.stack = 'Error stack trace...';

      responses.serverError(res, 'Internal error', error);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal error',
          error: {
            name: 'Error',
            message: 'Database connection failed',
            stack: 'Error stack trace...'
          }
        })
      );
    });

    it('should not include error details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Database connection failed');

      responses.serverError(res, 'Internal error', error);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal error'
        })
      );
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.anything() })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should call async function and pass through result', async () => {
      const mockAsyncFn = jest.fn().mockResolvedValue('success');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      const wrappedFn = asyncHandler(mockAsyncFn);
      await wrappedFn(req, res, next);

      expect(mockAsyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled(); // Should not call next on success
    });

    it('should catch async errors and call next', async () => {
      const error = new Error('Async operation failed');
      const mockAsyncFn = jest.fn().mockRejectedValue(error);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      const wrappedFn = asyncHandler(mockAsyncFn);
      await wrappedFn(req, res, next);

      expect(mockAsyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('handleDatabaseError', () => {
    let res;

    beforeEach(() => {
      res = createMockResponse();
      console.error = jest.fn(); // Mock console.error
    });

    it('should handle MongoDB validation errors', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          email: { path: 'email', message: 'Email is required', value: '' },
          name: { path: 'name', message: 'Name is required', value: '' }
        }
      };

      handleDatabaseError(error, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: [
            { field: 'email', message: 'Email is required', value: '' },
            { field: 'name', message: 'Name is required', value: '' }
          ]
        })
      );
    });

    it('should handle MongoDB cast errors', () => {
      const error = {
        name: 'CastError',
        path: 'userId',
        value: 'invalid-id'
      };

      handleDatabaseError(error, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid userId: invalid-id'
        })
      );
    });

    it('should handle MongoDB duplicate key errors', () => {
      const error = {
        code: 11000,
        keyValue: { email: 'test@example.com' }
      };

      handleDatabaseError(error, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'email already exists'
        })
      );
    });

    it('should handle MongoDB network errors', () => {
      const error = {
        name: 'MongoNetworkError',
        message: 'Connection timeout'
      };

      handleDatabaseError(error, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Database connection error'
        })
      );
    });

    it('should handle generic database errors', () => {
      const error = {
        name: 'UnknownError',
        message: 'Something went wrong'
      };

      handleDatabaseError(error, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Database operation failed'
        })
      );
    });
  });

  describe('validation helpers', () => {
    describe('validateObjectId', () => {
      it('should validate correct ObjectId', () => {
        const validId = '507f1f77bcf86cd799439011';
        expect(() => validation.validateObjectId(validId)).not.toThrow();
      });

      it('should throw error for invalid ObjectId', () => {
        const invalidId = 'invalid-id';
        expect(() => validation.validateObjectId(invalidId))
          .toThrow('Invalid ID format');
      });

      it('should throw error for null/undefined ID', () => {
        expect(() => validation.validateObjectId(null))
          .toThrow('Invalid ID format');
        expect(() => validation.validateObjectId(undefined))
          .toThrow('Invalid ID format');
      });

      it('should use custom field name in error message', () => {
        const invalidId = 'invalid';
        expect(() => validation.validateObjectId(invalidId, 'User ID'))
          .toThrow('Invalid User ID format');
      });
    });

    describe('validateRequiredFields', () => {
      it('should pass validation for valid data', () => {
        const data = { name: 'John', email: 'john@example.com' };
        const required = ['name', 'email'];
        
        expect(() => validation.validateRequiredFields(data, required))
          .not.toThrow();
      });

      it('should throw error for missing fields', () => {
        const data = { name: 'John' };
        const required = ['name', 'email', 'age'];
        
        expect(() => validation.validateRequiredFields(data, required))
          .toThrow('Missing required fields: email, age');
      });

      it('should treat empty strings as missing', () => {
        const data = { name: '', email: 'john@example.com' };
        const required = ['name', 'email'];
        
        expect(() => validation.validateRequiredFields(data, required))
          .toThrow('Missing required fields: name');
      });

      it('should treat null and undefined as missing', () => {
        const data = { name: null, email: undefined, age: 25 };
        const required = ['name', 'email', 'age'];
        
        expect(() => validation.validateRequiredFields(data, required))
          .toThrow('Missing required fields: name, email');
      });
    });

    describe('validatePagination', () => {
      it('should return valid pagination parameters', () => {
        const query = { limit: '10', offset: '20' };
        const result = validation.validatePagination(query);
        
        expect(result).toEqual({ limit: 10, offset: 20 });
      });

      it('should use default values for missing parameters', () => {
        const query = {};
        const result = validation.validatePagination(query);
        
        expect(result).toEqual({ limit: 20, offset: 0 });
      });

      it('should throw error for invalid limit', () => {
        const query = { limit: '150' }; // Over max of 100
        
        expect(() => validation.validatePagination(query))
          .toThrow('Limit must be between 1 and 100');
      });

      it('should throw error for negative offset', () => {
        const query = { offset: '-5' };
        
        expect(() => validation.validatePagination(query))
          .toThrow('Offset must be non-negative');
      });

      it('should handle string numbers correctly', () => {
        const query = { limit: '50', offset: '100' };
        const result = validation.validatePagination(query);
        
        expect(result).toEqual({ limit: 50, offset: 100 });
      });
    });
  });

  describe('createPaginationMeta', () => {
    it('should create correct pagination metadata', () => {
      const data = Array(10).fill().map((_, i) => ({ id: i }));
      const result = createPaginationMeta(data, 100, 10, 20);

      expect(result.pagination).toEqual({
        currentPage: 3,
        totalPages: 10,
        totalItems: 100,
        itemsPerPage: 10,
        hasNextPage: true,
        hasPrevPage: true,
        nextPage: 4,
        prevPage: 2,
        startIndex: 21,
        endIndex: 30
      });
    });

    it('should handle first page correctly', () => {
      const data = Array(10).fill().map((_, i) => ({ id: i }));
      const result = createPaginationMeta(data, 100, 10, 0);

      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 10,
        totalItems: 100,
        itemsPerPage: 10,
        hasNextPage: true,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: null,
        startIndex: 1,
        endIndex: 10
      });
    });

    it('should handle last page correctly', () => {
      const data = Array(5).fill().map((_, i) => ({ id: i }));
      const result = createPaginationMeta(data, 95, 10, 90);

      expect(result.pagination).toEqual({
        currentPage: 10,
        totalPages: 10,
        totalItems: 95,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: true,
        nextPage: null,
        prevPage: 9,
        startIndex: 91,
        endIndex: 95
      });
    });
  });

  describe('search helpers', () => {
    describe('buildSearchQuery', () => {
      it('should build MongoDB search query with default fields', () => {
        const result = search.buildSearchQuery('javascript');

        expect(result).toEqual({
          $or: [
            { title: { $regex: /javascript/i } },
            { content: { $regex: /javascript/i } },
            { description: { $regex: /javascript/i } }
          ]
        });
      });

      it('should build search query with custom fields', () => {
        const result = search.buildSearchQuery('test', ['name', 'email']);

        expect(result).toEqual({
          $or: [
            { name: { $regex: /test/i } },
            { email: { $regex: /test/i } }
          ]
        });
      });

      it('should return empty object for empty search term', () => {
        const result = search.buildSearchQuery('');
        expect(result).toEqual({});
      });

      it('should escape special regex characters', () => {
        const result = search.buildSearchQuery('test.query*');

        expect(result.$or[0].title.$regex.source).toBe('test\\.query\\*');
      });
    });

    describe('buildSortQuery', () => {
      it('should build sort query with default values', () => {
        const result = search.buildSortQuery();
        expect(result).toEqual({ createdAt: -1 });
      });

      it('should build sort query with custom field and order', () => {
        const result = search.buildSortQuery('title', 'asc');
        expect(result).toEqual({ title: 1 });
      });

      it('should reject invalid sort fields', () => {
        const result = search.buildSortQuery('invalidField');
        expect(result).toEqual({ createdAt: -1 });
      });

      it('should handle case insensitive order', () => {
        const result = search.buildSortQuery('name', 'ASC');
        expect(result).toEqual({ name: 1 });
      });
    });

    describe('buildFilterQuery', () => {
      it('should build filter query for allowed filters', () => {
        const query = { category: 'tech', status: 'active', invalid: 'test' };
        const allowedFilters = ['category', 'status'];

        const result = search.buildFilterQuery(query, allowedFilters);

        expect(result).toEqual({
          category: 'tech',
          status: 'active'
        });
      });

      it('should handle boolean filters', () => {
        const query = { isPublic: 'true', isActive: 'false' };
        const allowedFilters = ['isPublic', 'isActive'];

        const result = search.buildFilterQuery(query, allowedFilters);

        expect(result).toEqual({
          isPublic: true,
          isActive: false
        });
      });

      it('should handle array filters', () => {
        const query = { tags: ['javascript', 'nodejs'] };
        const allowedFilters = ['tags'];

        const result = search.buildFilterQuery(query, allowedFilters);

        expect(result).toEqual({
          tags: { $in: ['javascript', 'nodejs'] }
        });
      });
    });
  });

  describe('transform helpers', () => {
    describe('sanitizeUser', () => {
      it('should remove sensitive fields from user object', () => {
        const user = {
          id: 1,
          email: 'user@example.com',
          password: 'secret',
          refreshToken: 'token123',
          __v: 0,
          name: 'John Doe'
        };

        const result = transform.sanitizeUser(user);

        expect(result).toEqual({
          id: 1,
          email: 'user@example.com',
          name: 'John Doe'
        });
        expect(result).not.toHaveProperty('password');
        expect(result).not.toHaveProperty('refreshToken');
        expect(result).not.toHaveProperty('__v');
      });

      it('should return null for null input', () => {
        const result = transform.sanitizeUser(null);
        expect(result).toBe(null);
      });
    });

    describe('toPlainObject', () => {
      it('should convert MongoDB document to plain object', () => {
        const mockDoc = {
          _id: 'test',
          name: 'Test',
          toObject: jest.fn(() => ({ _id: 'test', name: 'Test' }))
        };

        const result = transform.toPlainObject(mockDoc);

        expect(mockDoc.toObject).toHaveBeenCalled();
        expect(result).toEqual({ _id: 'test', name: 'Test' });
      });

      it('should return object as-is if no toObject method', () => {
        const plainObj = { _id: 'test', name: 'Test' };
        const result = transform.toPlainObject(plainObj);

        expect(result).toBe(plainObj);
      });

      it('should return null for null input', () => {
        const result = transform.toPlainObject(null);
        expect(result).toBe(null);
      });
    });

    describe('transformArray', () => {
      it('should transform array of documents', () => {
        const docs = [
          { toObject: () => ({ id: 1, name: 'Doc 1' }) },
          { toObject: () => ({ id: 2, name: 'Doc 2' }) }
        ];

        const result = transform.transformArray(docs);

        expect(result).toEqual([
          { id: 1, name: 'Doc 1' },
          { id: 2, name: 'Doc 2' }
        ]);
      });

      it('should return empty array for non-array input', () => {
        const result = transform.transformArray(null);
        expect(result).toEqual([]);
      });

      it('should use custom transformer function', () => {
        const docs = [{ name: 'test1' }, { name: 'test2' }];
        const customTransformer = (doc) => ({ ...doc, transformed: true });

        const result = transform.transformArray(docs, customTransformer);

        expect(result).toEqual([
          { name: 'test1', transformed: true },
          { name: 'test2', transformed: true }
        ]);
      });
    });
  });

  describe('withPerformanceMonitoring', () => {
    beforeEach(() => {
      console.log = jest.fn();
      console.warn = jest.fn();
      console.error = jest.fn();
    });

    it('should monitor successful operations', async () => {
      const mockOperation = jest.fn().mockImplementation(async () => {
        // Add small delay to ensure non-zero execution time
        await new Promise(resolve => setTimeout(resolve, 1));
        return 'success';
      });

      const result = await withPerformanceMonitoring(mockOperation, 'test-operation');

      expect(result.result).toBe('success');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should log warning for slow operations', async () => {
      const slowOperation = () => new Promise(resolve => 
        setTimeout(() => resolve('done'), 1100) // >1000ms
      );

      const result = await withPerformanceMonitoring(slowOperation, 'slow-operation');

      expect(result.result).toBe('done');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow slow-operation:')
      );
    });

    it('should handle operation failures', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(
        withPerformanceMonitoring(failingOperation, 'failing-operation')
      ).rejects.toThrow('Operation failed');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed failing-operation after'),
        expect.any(Error)
      );
    });
  });

  describe('cache helpers', () => {
    beforeEach(() => {
      cache.clear();
    });

    it('should store and retrieve values', () => {
      cache.set('test-key', 'test-value');
      const result = cache.get('test-key');

      expect(result).toBe('test-value');
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBe(null);
    });

    it('should respect TTL and expire values', (done) => {
      cache.set('expire-key', 'expire-value', 50); // 50ms TTL

      // Should exist immediately
      expect(cache.get('expire-key')).toBe('expire-value');

      // Should be expired after TTL
      setTimeout(() => {
        expect(cache.get('expire-key')).toBe(null);
        done();
      }, 60);
    });

    it('should delete values', () => {
      cache.set('delete-key', 'delete-value');
      expect(cache.get('delete-key')).toBe('delete-value');

      cache.delete('delete-key');
      expect(cache.get('delete-key')).toBe(null);
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');

      cache.clear();

      expect(cache.get('key1')).toBe(null);
      expect(cache.get('key2')).toBe(null);
    });
  });
});