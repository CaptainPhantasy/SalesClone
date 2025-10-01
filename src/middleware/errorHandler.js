/**
 * @fileoverview Error handling middleware for Express application
 * @author LegacyAI Subagent Fleet - API Server & WebSocket Agent
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * This module provides:
 * - Global error handling middleware
 * - 404 not found handler
 * - Standardized error responses
 * - Different error handling for development vs production
 * - Error logging with timestamps
 */

/**
 * Generate unique request ID for tracking
 * @returns {string} UUID v4 string
 * @created 2025-10-01T18:00:00Z
 */
function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Not Found (404) handler
 * Handles requests to undefined routes
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 */
function notFoundHandler(req, res, next) {
  const timestamp = new Date().toISOString();
  const requestId = generateRequestId();

  console.log(`[${timestamp}] [WARN] [errorHandler] 404 Not Found - ${req.method} ${req.originalUrl}`);
  console.log(`[${timestamp}] [WARN] [errorHandler] RequestID: ${requestId}, IP: ${req.ip}`);

  // Create 404 error
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  error.requestId = requestId;

  // Pass to error handler
  next(error);
}

/**
 * Global error handler middleware
 * Catches and processes all errors in the application
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 */
function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  const requestId = err.requestId || req.requestId || generateRequestId();
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Determine status code
  // Default to 500 if not set
  const statusCode = err.status || err.statusCode || 500;

  // Log error details
  console.error(`[${timestamp}] [ERROR] [errorHandler] ====================================`);
  console.error(`[${timestamp}] [ERROR] [errorHandler] Error occurred - RequestID: ${requestId}`);
  console.error(`[${timestamp}] [ERROR] [errorHandler] Method: ${req.method}, Path: ${req.originalUrl}`);
  console.error(`[${timestamp}] [ERROR] [errorHandler] Status: ${statusCode}, Message: ${err.message}`);
  console.error(`[${timestamp}] [ERROR] [errorHandler] IP: ${req.ip}, User-Agent: ${req.get('user-agent')}`);

  // Log stack trace in development
  if (nodeEnv === 'development') {
    console.error(`[${timestamp}] [ERROR] [errorHandler] Stack trace:`, err.stack);
  }

  console.error(`[${timestamp}] [ERROR] [errorHandler] ====================================`);

  // Prepare error response based on environment
  const errorResponse = {
    success: false,
    data: null,
    error: err.message || 'An unexpected error occurred',
    timestamp,
    requestId,
  };

  // In development, include additional debugging information
  if (nodeEnv === 'development') {
    errorResponse.debug = {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      params: req.params,
      query: req.query,
      body: req.body,
    };
  }

  // Handle specific error types

  // Validation errors (from express-validator or custom validation)
  if (err.name === 'ValidationError') {
    console.error(`[${timestamp}] [ERROR] [errorHandler] Validation error encountered`);
    errorResponse.error = 'Validation failed';
    errorResponse.validationErrors = err.errors || err.details;
    return res.status(400).json(errorResponse);
  }

  // JWT/Authentication errors
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    console.error(`[${timestamp}] [ERROR] [errorHandler] Authentication error encountered`);
    errorResponse.error = 'Authentication failed';
    return res.status(401).json(errorResponse);
  }

  // Database errors (Supabase/PostgreSQL)
  if (err.code && err.code.startsWith('23')) { // PostgreSQL error codes
    console.error(`[${timestamp}] [ERROR] [errorHandler] Database constraint error: ${err.code}`);

    // Common PostgreSQL errors
    if (err.code === '23505') { // Unique violation
      errorResponse.error = 'Duplicate entry - record already exists';
      return res.status(409).json(errorResponse);
    }

    if (err.code === '23503') { // Foreign key violation
      errorResponse.error = 'Referenced record does not exist';
      return res.status(400).json(errorResponse);
    }

    // Generic database error
    errorResponse.error = 'Database operation failed';
    return res.status(500).json(errorResponse);
  }

  // Twilio API errors
  if (err.code && typeof err.code === 'number' && err.code >= 20000 && err.code < 30000) {
    console.error(`[${timestamp}] [ERROR] [errorHandler] Twilio API error: ${err.code}`);
    errorResponse.error = `Twilio API error: ${err.message}`;
    return res.status(503).json(errorResponse); // Service unavailable
  }

  // OpenAI/Anthropic API errors
  if (err.type === 'invalid_request_error' || err.type === 'api_error') {
    console.error(`[${timestamp}] [ERROR] [errorHandler] AI API error: ${err.type}`);
    errorResponse.error = 'AI service temporarily unavailable';
    return res.status(503).json(errorResponse);
  }

  // Rate limiting errors
  if (err.status === 429 || err.statusCode === 429) {
    console.error(`[${timestamp}] [ERROR] [errorHandler] Rate limit exceeded`);
    errorResponse.error = 'Too many requests - please try again later';

    // Include retry-after header if available
    if (err.retryAfter) {
      res.set('Retry-After', err.retryAfter);
    }

    return res.status(429).json(errorResponse);
  }

  // Timeout errors
  if (err.code === 'ETIMEDOUT' || err.timeout) {
    console.error(`[${timestamp}] [ERROR] [errorHandler] Request timeout`);
    errorResponse.error = 'Request timeout - operation took too long';
    return res.status(504).json(errorResponse); // Gateway timeout
  }

  // Generic errors - use status code from error or default to 500
  // In production, don't expose internal error messages
  if (nodeEnv === 'production' && statusCode === 500) {
    errorResponse.error = 'An internal server error occurred. Please contact support if this persists.';
  }

  return res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch rejected promises
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware that catches async errors
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * @example
 * router.get('/example', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    // Execute the async function and catch any errors
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create custom error with status code
 *
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {Object} additional - Additional error properties
 * @returns {Error} Error object with status
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * @example
 * throw createError(404, 'User not found', { userId: 123 });
 */
function createError(status, message, additional = {}) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;

  // Attach additional properties
  Object.keys(additional).forEach(key => {
    error[key] = additional[key];
  });

  return error;
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
};
