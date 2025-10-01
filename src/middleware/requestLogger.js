/**
 * @fileoverview Request logging middleware for Express application
 * @author LegacyAI Subagent Fleet - API Server & WebSocket Agent
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * This middleware provides:
 * - Request/response logging with timestamps
 * - Unique request ID generation and tracking
 * - Request duration measurement
 * - IP address logging (masked for privacy in production)
 * - User agent logging
 * - Method, path, status code, and response time tracking
 */

/**
 * Generate unique request ID for tracking
 * Uses UUID v4 format
 *
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
 * Mask IP address for privacy
 * Masks the last octet of IPv4 or last 4 segments of IPv6
 *
 * @param {string} ip - IP address to mask
 * @returns {string} Masked IP address
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * @example
 * maskIP('192.168.1.100') // Returns '192.168.1.xxx'
 * maskIP('::ffff:192.168.1.100') // Returns '::ffff:192.168.1.xxx'
 */
function maskIP(ip) {
  if (!ip) return 'unknown';

  try {
    // Handle IPv4
    if (ip.includes('.') && !ip.includes(':')) {
      const parts = ip.split('.');
      parts[parts.length - 1] = 'xxx';
      return parts.join('.');
    }

    // Handle IPv6 or IPv4-mapped IPv6
    if (ip.includes(':')) {
      // Check if it's IPv4-mapped IPv6 (e.g., ::ffff:192.168.1.100)
      if (ip.includes('::ffff:')) {
        const ipv4Part = ip.split('::ffff:')[1];
        const parts = ipv4Part.split('.');
        parts[parts.length - 1] = 'xxx';
        return `::ffff:${parts.join('.')}`;
      }

      // Regular IPv6 - mask last segment
      const parts = ip.split(':');
      parts[parts.length - 1] = 'xxxx';
      return parts.join(':');
    }

    return 'unknown';
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [requestLogger] Failed to mask IP: ${error.message}`);
    return 'unknown';
  }
}

/**
 * Request logging middleware
 * Logs all incoming requests and their responses with detailed metadata
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 */
function requestLogger(req, res, next) {
  // Generate unique request ID
  const requestId = generateRequestId();
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Attach request ID to request object for use in other middleware/routes
  req.requestId = requestId;

  // Get IP address - handle proxy headers
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             'unknown';

  // Get user agent
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Mask IP for privacy in production
  const maskedIP = process.env.NODE_ENV === 'production' ? maskIP(ip) : ip;

  // Log incoming request
  console.log(`[${timestamp}] [INFO] [requestLogger] ====================================`);
  console.log(`[${timestamp}] [INFO] [requestLogger] Incoming Request - RequestID: ${requestId}`);
  console.log(`[${timestamp}] [INFO] [requestLogger] ${req.method} ${req.originalUrl}`);
  console.log(`[${timestamp}] [INFO] [requestLogger] IP: ${maskedIP}`);

  // Log query parameters if present
  if (Object.keys(req.query).length > 0) {
    console.log(`[${timestamp}] [DEBUG] [requestLogger] Query Params:`, req.query);
  }

  // Log request body for POST/PUT/PATCH (but sanitize sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    // Create a copy of the body to avoid modifying the original
    const sanitizedBody = { ...req.body };

    // List of fields to sanitize (remove values)
    const sensitiveFields = [
      'password',
      'token',
      'apiKey',
      'api_key',
      'authToken',
      'auth_token',
      'secret',
      'creditCard',
      'credit_card',
      'ssn',
      'socialSecurity',
    ];

    // Sanitize sensitive fields
    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '[REDACTED]';
      }
    });

    console.log(`[${timestamp}] [DEBUG] [requestLogger] Request Body:`, sanitizedBody);
  }

  // Log user agent (truncated for brevity)
  const truncatedUA = userAgent.length > 100 ? `${userAgent.substring(0, 100)}...` : userAgent;
  console.log(`[${timestamp}] [DEBUG] [requestLogger] User-Agent: ${truncatedUA}`);

  // Override res.json to capture response and log after sending
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    // Calculate request duration
    const duration = Date.now() - startTime;
    const responseTimestamp = new Date().toISOString();

    // Log response details
    console.log(`[${responseTimestamp}] [INFO] [requestLogger] Response - RequestID: ${requestId}`);
    console.log(`[${responseTimestamp}] [INFO] [requestLogger] ${req.method} ${req.originalUrl}`);
    console.log(`[${responseTimestamp}] [INFO] [requestLogger] Status: ${res.statusCode}, Duration: ${duration}ms`);

    // Log warning for slow requests (> 2 seconds)
    if (duration > 2000) {
      console.warn(`[${responseTimestamp}] [WARN] [requestLogger] Slow request detected - ${duration}ms`);
    }

    // Log error status codes
    if (res.statusCode >= 400) {
      console.error(`[${responseTimestamp}] [ERROR] [requestLogger] Error response - Status: ${res.statusCode}`);

      // Log response body for errors (may contain error details)
      if (body && body.error) {
        console.error(`[${responseTimestamp}] [ERROR] [requestLogger] Error message: ${body.error}`);
      }
    }

    console.log(`[${responseTimestamp}] [INFO] [requestLogger] ====================================`);

    // Call original json method
    return originalJson(body);
  };

  // Override res.send to capture non-JSON responses
  const originalSend = res.send.bind(res);
  res.send = function(body) {
    // Calculate request duration
    const duration = Date.now() - startTime;
    const responseTimestamp = new Date().toISOString();

    // Only log if not already logged by res.json
    if (res.get('Content-Type')?.includes('text/xml') || res.get('Content-Type')?.includes('text/html')) {
      console.log(`[${responseTimestamp}] [INFO] [requestLogger] Response - RequestID: ${requestId}`);
      console.log(`[${responseTimestamp}] [INFO] [requestLogger] ${req.method} ${req.originalUrl}`);
      console.log(`[${responseTimestamp}] [INFO] [requestLogger] Status: ${res.statusCode}, Duration: ${duration}ms`);
      console.log(`[${responseTimestamp}] [INFO] [requestLogger] Content-Type: ${res.get('Content-Type')}`);

      // Log warning for slow requests
      if (duration > 2000) {
        console.warn(`[${responseTimestamp}] [WARN] [requestLogger] Slow request detected - ${duration}ms`);
      }

      console.log(`[${responseTimestamp}] [INFO] [requestLogger] ====================================`);
    }

    // Call original send method
    return originalSend(body);
  };

  // Handle response finish event (for cases where neither json nor send is called)
  res.on('finish', () => {
    // Only log if not already logged
    if (!res.headersSent || res.get('Content-Type')?.includes('application/octet-stream')) {
      const duration = Date.now() - startTime;
      const responseTimestamp = new Date().toISOString();

      console.log(`[${responseTimestamp}] [INFO] [requestLogger] Response - RequestID: ${requestId}`);
      console.log(`[${responseTimestamp}] [INFO] [requestLogger] ${req.method} ${req.originalUrl}`);
      console.log(`[${responseTimestamp}] [INFO] [requestLogger] Status: ${res.statusCode}, Duration: ${duration}ms`);
      console.log(`[${responseTimestamp}] [INFO] [requestLogger] ====================================`);
    }
  });

  // Continue to next middleware
  next();
}

/**
 * Skip logging for specific routes
 * Useful for health checks and static assets
 *
 * @param {string[]} paths - Array of paths to skip logging
 * @returns {Function} Conditional request logger middleware
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * @example
 * app.use(skipLoggingFor(['/health', '/favicon.ico']));
 */
function skipLoggingFor(paths = []) {
  return (req, res, next) => {
    // Check if current path should skip logging
    const shouldSkip = paths.some(path => req.originalUrl.startsWith(path));

    if (shouldSkip) {
      // Skip logging, just continue
      return next();
    }

    // Use normal request logger
    return requestLogger(req, res, next);
  };
}

module.exports = requestLogger;
module.exports.skipLoggingFor = skipLoggingFor;
module.exports.generateRequestId = generateRequestId;
module.exports.maskIP = maskIP;
