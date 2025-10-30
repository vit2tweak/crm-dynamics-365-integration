import { SyncError } from '../types/index';

// Error types
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  SYNC_ERROR = 'sync_error',
  DATA_ERROR = 'data_error',
  CONFIGURATION_ERROR = 'configuration_error',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Custom error class
export class CRMError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly source?: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code?: string,
    details?: any,
    source?: string
  ) {
    super(message);
    this.name = 'CRMError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.source = source;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CRMError);
    }
  }
}

// Error factory functions
export const createValidationError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.VALIDATION, ErrorSeverity.MEDIUM, 'VALIDATION_ERROR', details);
};

export const createNetworkError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.NETWORK, ErrorSeverity.HIGH, 'NETWORK_ERROR', details);
};

export const createAuthenticationError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.AUTHENTICATION, ErrorSeverity.HIGH, 'AUTH_ERROR', details);
};

export const createAuthorizationError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.AUTHORIZATION, ErrorSeverity.HIGH, 'AUTHZ_ERROR', details);
};

export const createNotFoundError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.NOT_FOUND, ErrorSeverity.MEDIUM, 'NOT_FOUND', details);
};

export const createConflictError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.CONFLICT, ErrorSeverity.MEDIUM, 'CONFLICT_ERROR', details);
};

export const createRateLimitError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.RATE_LIMIT, ErrorSeverity.HIGH, 'RATE_LIMIT', details);
};

export const createServerError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.SERVER_ERROR, ErrorSeverity.CRITICAL, 'SERVER_ERROR', details);
};

export const createSyncError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.SYNC_ERROR, ErrorSeverity.HIGH, 'SYNC_ERROR', details);
};

export const createDataError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.DATA_ERROR, ErrorSeverity.MEDIUM, 'DATA_ERROR', details);
};

export const createConfigurationError = (message: string, details?: any): CRMError => {
  return new CRMError(message, ErrorType.CONFIGURATION_ERROR, ErrorSeverity.HIGH, 'CONFIG_ERROR', details);
};

// Error parsing and classification
export const parseError = (error: any): CRMError => {
  if (error instanceof CRMError) {
    return error;
  }

  if (error instanceof Error)