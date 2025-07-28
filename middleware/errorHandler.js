import winston from 'winston';

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log',
      level: 'error'
    })
  ]
});

// ================================
// ERROR HANDLER MIDDLEWARE
// ================================
export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    walletAddress: req.walletAddress?.slice(0, 8) + '...' || 'anonymous'
  });

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Determine error type and appropriate response
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let errorCode = 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError' || err.message.includes('unauthorized')) {
    statusCode = 401;
    errorMessage = 'Unauthorized access';
    errorCode = 'UNAUTHORIZED';
  } else if (err.name === 'ForbiddenError' || err.message.includes('forbidden')) {
    statusCode = 403;
    errorMessage = 'Access forbidden';
    errorCode = 'FORBIDDEN';
  } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
    statusCode = 404;
    errorMessage = 'Resource not found';
    errorCode = 'NOT_FOUND';
  } else if (err.name === 'ConflictError' || err.message.includes('conflict')) {
    statusCode = 409;
    errorMessage = 'Resource conflict';
    errorCode = 'CONFLICT';
  } else if (err.name === 'RateLimitError' || err.message.includes('rate limit')) {
    statusCode = 429;
    errorMessage = 'Rate limit exceeded';
    errorCode = 'RATE_LIMIT';
  } else if (err.message.includes('timeout')) {
    statusCode = 504;
    errorMessage = 'Request timeout';
    errorCode = 'TIMEOUT';
  } else if (err.message.includes('network') || err.message.includes('connection')) {
    statusCode = 503;
    errorMessage = 'Service temporarily unavailable';
    errorCode = 'SERVICE_UNAVAILABLE';
  }

  // Solana-specific errors
  if (err.message.includes('insufficient funds')) {
    statusCode = 400;
    errorMessage = 'Insufficient funds for transaction';
    errorCode = 'INSUFFICIENT_FUNDS';
  } else if (err.message.includes('signature verification')) {
    statusCode = 401;
    errorMessage = 'Invalid signature';
    errorCode = 'INVALID_SIGNATURE';
  } else if (err.message.includes('token mint')) {
    statusCode = 500;
    errorMessage = 'Token creation failed';
    errorCode = 'TOKEN_CREATION_FAILED';
  }

  // AI service specific errors
  if (err.message.includes('OpenAI') || err.message.includes('DALL-E')) {
    statusCode = 503;
    errorMessage = 'AI image generation service unavailable';
    errorCode = 'AI_SERVICE_ERROR';
  } else if (err.message.includes('Stability')) {
    statusCode = 503;
    errorMessage = 'AI image generation service unavailable';
    errorCode = 'AI_SERVICE_ERROR';
  }

  // Storage service errors
  if (err.message.includes('Arweave') || err.message.includes('IPFS')) {
    statusCode = 503;
    errorMessage = 'Storage service unavailable';
    errorCode = 'STORAGE_ERROR';
  }

  // Build error response
  const errorResponse = {
    success: false,
    error: errorMessage,
    code: errorCode,
    timestamp: new Date().toISOString(),
    requestId: req.id || req.headers['x-request-id'] || 'unknown'
  };

  // Add error details in development
  if (isDevelopment) {
    errorResponse.details = {
      message: err.message,
      stack: err.stack,
      name: err.name
    };
  }

  // Add retry information for temporary errors
  if (statusCode >= 500 && statusCode < 600) {
    errorResponse.retryable = true;
    errorResponse.retryAfter = statusCode === 429 ? 60 : 30; // seconds
  }

  // Send error response
  if (!res.headersSent) {
    res.status(statusCode).json(errorResponse);
  }
};

// ================================
// ASYNC ERROR WRAPPER
// ================================
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ================================
// NOT FOUND HANDLER
// ================================
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.name = 'NotFoundError';
  next(error);
};

// ================================
// VALIDATION ERROR HANDLER
// ================================
export const validationErrorHandler = (validationResult) => {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.details = errors.array();
      return next(error);
    }
    next();
  };
};

// ================================
// BUSINESS LOGIC ERROR CLASSES
// ================================
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.operational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

// ================================
// SOLANA-SPECIFIC ERRORS
// ================================
export class SolanaError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'SOLANA_ERROR');
    this.name = 'SolanaError';
    this.originalError = originalError;
  }
}

export class InsufficientFundsError extends SolanaError {
  constructor(message = 'Insufficient SOL balance for transaction') {
    super(message, 400, 'INSUFFICIENT_FUNDS');
    this.name = 'InsufficientFundsError';
  }
}

export class TokenCreationError extends SolanaError {
  constructor(message = 'Token creation failed', originalError = null) {
    super(message, 500, 'TOKEN_CREATION_FAILED');
    this.name = 'TokenCreationError';
    this.originalError = originalError;
  }
}

// ================================
// AI SERVICE ERRORS
// ================================
export class AIServiceError extends AppError {
  constructor(message, provider = 'unknown') {
    super(message, 503, 'AI_SERVICE_ERROR');
    this.name = 'AIServiceError';
    this.provider = provider;
  }
}

export class ImageGenerationError extends AIServiceError {
  constructor(message, provider = 'unknown') {
    super(message, provider);
    this.name = 'ImageGenerationError';
  }
}

// ================================
// STORAGE SERVICE ERRORS
// ================================
export class StorageError extends AppError {
  constructor(message, provider = 'unknown') {
    super(message, 503, 'STORAGE_ERROR');
    this.name = 'StorageError';
    this.provider = provider;
  }
}

export class MetadataUploadError extends StorageError {
  constructor(message, provider = 'unknown') {
    super(message, provider);
    this.name = 'MetadataUploadError';
  }
}

// ================================
// ERROR REPORTING
// ================================
export const reportError = (error, context = {}) => {
  logger.error('Error reported', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    statusCode: error.statusCode,
    context,
    timestamp: new Date().toISOString()
  });

  // In production, you might want to send to external error reporting service
  // e.g., Sentry, Bugsnag, etc.
  if (process.env.NODE_ENV === 'production') {
    // Send to external service
    // sentry.captureException(error, { extra: context });
  }
};

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  validationErrorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  SolanaError,
  InsufficientFundsError,
  TokenCreationError,
  AIServiceError,
  ImageGenerationError,
  StorageError,
  MetadataUploadError,
  reportError
};