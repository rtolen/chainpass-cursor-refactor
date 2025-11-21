/**
 * ChainPass SDK Error Classes
 * Custom error classes for better error handling
 */

export class ChainPassError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'ChainPassError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ChainPassError);
    }
  }
}

export class AuthenticationError extends ChainPassError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ChainPassError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ChainPassError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ChainPassError {
  constructor(message: string = 'Rate limit exceeded', details?: unknown) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends ChainPassError {
  constructor(message: string = 'Network request failed', details?: unknown) {
    super(message, 0, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class WebhookSignatureError extends ChainPassError {
  constructor(message: string = 'Webhook signature verification failed', details?: unknown) {
    super(message, 401, 'INVALID_SIGNATURE', details);
    this.name = 'WebhookSignatureError';
  }
}

/**
 * Factory function to create appropriate error based on status code
 */
export function createErrorFromResponse(
  statusCode: number,
  message: string,
  details?: unknown
): ChainPassError {
  switch (statusCode) {
    case 401:
    case 403:
      return new AuthenticationError(message, details);
    case 400:
      return new ValidationError(message, details);
    case 404:
      return new NotFoundError(message, details);
    case 429:
      return new RateLimitError(message, details);
    default:
      return new ChainPassError(message, statusCode, undefined, details);
  }
}
