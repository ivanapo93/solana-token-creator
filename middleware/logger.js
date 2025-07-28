import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// ================================
// LOGGER CONFIGURATION
// ================================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'solmeme-backend',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Error log file
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined log file
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    // Access log file
    new winston.transports.File({ 
      filename: 'logs/access.log', 
      level: 'http',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// ================================
// REQUEST LOGGER MIDDLEWARE
// ================================
export const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.id = uuidv4();
  
  // Add request ID to response headers
  res.set('X-Request-ID', req.id);

  // Start timer
  const startTime = Date.now();

  // Log request start
  logger.http('Request started', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type'),
    timestamp: new Date().toISOString(),
    walletAddress: req.walletAddress?.slice(0, 8) + '...' || 'anonymous'
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    logger.http('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString(),
      walletAddress: req.walletAddress?.slice(0, 8) + '...' || 'anonymous'
    });

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// ================================
// API OPERATION LOGGER
// ================================
export const logApiOperation = (operation, details = {}) => {
  logger.info('API Operation', {
    operation,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// ================================
// BUSINESS LOGIC LOGGER
// ================================
export const logBusinessEvent = (event, data = {}) => {
  logger.info('Business Event', {
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

// ================================
// SECURITY EVENT LOGGER
// ================================
export const logSecurityEvent = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    severity: 'security'
  });
};

// ================================
// PERFORMANCE LOGGER
// ================================
export const logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
  
  logger.log(level, 'Performance Metric', {
    operation,
    duration: `${duration}ms`,
    slow: duration > 1000,
    verySlow: duration > 5000,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

// ================================
// BLOCKCHAIN TRANSACTION LOGGER
// ================================
export const logTransaction = (type, data = {}) => {
  logger.info('Blockchain Transaction', {
    type,
    ...data,
    timestamp: new Date().toISOString(),
    category: 'blockchain'
  });
};

// ================================
// ERROR LOGGER WITH CONTEXT
// ================================
export const logError = (error, context = {}) => {
  logger.error('Application Error', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context,
    timestamp: new Date().toISOString()
  });
};

// ================================
// USER ACTION LOGGER
// ================================
export const logUserAction = (action, walletAddress, details = {}) => {
  logger.info('User Action', {
    action,
    walletAddress: walletAddress?.slice(0, 8) + '...' || 'anonymous',
    ...details,
    timestamp: new Date().toISOString(),
    category: 'user-activity'
  });
};

// ================================
// RATE LIMITING LOGGER
// ================================
export const logRateLimit = (identifier, endpoint, details = {}) => {
  logger.warn('Rate Limit Hit', {
    identifier: identifier?.slice(0, 8) + '...' || 'unknown',
    endpoint,
    ...details,
    timestamp: new Date().toISOString(),
    category: 'rate-limiting'
  });
};

// ================================
// MIDDLEWARE FOR STRUCTURED LOGGING
// ================================
export const addLogContext = (context) => {
  return (req, res, next) => {
    // Add context to request for use in route handlers
    req.logContext = { ...req.logContext, ...context };
    next();
  };
};

// ================================
// PERFORMANCE MONITORING MIDDLEWARE
// ================================
export const performanceMonitor = (operationName) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.end to measure performance
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const duration = Date.now() - startTime;
      
      logPerformance(operationName, duration, {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        walletAddress: req.walletAddress?.slice(0, 8) + '...' || 'anonymous'
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// ================================
// AUDIT LOGGER
// ================================
export const logAuditEvent = (event, actor, target, details = {}) => {
  logger.info('Audit Event', {
    event,
    actor: actor?.slice(0, 8) + '...' || 'system',
    target: target?.slice(0, 8) + '...' || 'unknown',
    ...details,
    timestamp: new Date().toISOString(),
    category: 'audit'
  });
};

// ================================
// STARTUP LOGGER
// ================================
export const logStartup = (message, details = {}) => {
  logger.info('Application Startup', {
    message,
    ...details,
    timestamp: new Date().toISOString(),
    category: 'startup'
  });
};

// ================================
// EXTERNAL SERVICE LOGGER
// ================================
export const logExternalService = (service, operation, status, details = {}) => {
  logger.info('External Service Call', {
    service,
    operation,
    status,
    ...details,
    timestamp: new Date().toISOString(),
    category: 'external-service'
  });
};

// ================================
// LOG AGGREGATION HELPERS
// ================================
export const createLogStream = () => {
  return {
    write: (message) => {
      logger.info(message.trim());
    }
  };
};

// ================================
// LOG ANALYSIS HELPERS
// ================================
export const getLogStats = () => {
  // In a production environment, you might query a log aggregation service
  return {
    totalRequests: 'N/A - requires log aggregation service',
    errorRate: 'N/A - requires log aggregation service',
    averageResponseTime: 'N/A - requires log aggregation service',
    topEndpoints: 'N/A - requires log aggregation service'
  };
};

// ================================
// EXPORT MAIN LOGGER
// ================================
export default logger;