/**
 * Standardized API Error Responses
 *
 * Provides consistent error formatting across all API routes.
 * All API routes should use these helpers instead of creating
 * ad-hoc error responses.
 *
 * @example
 * ```typescript
 * import { createErrorResponse, createValidationError } from '@/lib/api/error-response';
 *
 * // Simple error
 * return createErrorResponse('User not found', 404);
 *
 * // Error with code
 * return createErrorResponse('Trial limit exceeded', 403, 'TRIAL_LIMIT_REACHED');
 *
 * // Validation error
 * return createValidationError('email', 'Invalid email format');
 * ```
 */

import { NextResponse } from 'next/server';

/**
 * Standard API error response format.
 * All API errors should conform to this interface.
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Standard API success response format for mutation operations.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * Validation error details for field-level errors.
 */
export interface ValidationErrorDetails {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Create a standardized error response.
 *
 * @param error - Human-readable error message
 * @param status - HTTP status code (default: 500)
 * @param code - Optional machine-readable error code
 * @param details - Optional additional context (e.g., validation errors)
 * @returns NextResponse with standardized error format
 *
 * @example
 * ```typescript
 * // Simple 404
 * return createErrorResponse('Resource not found', 404);
 *
 * // With error code
 * return createErrorResponse(
 *   'Rate limit exceeded',
 *   429,
 *   'RATE_LIMIT_EXCEEDED'
 * );
 *
 * // With details
 * return createErrorResponse(
 *   'Validation failed',
 *   400,
 *   'VALIDATION_ERROR',
 *   { fields: ['email', 'password'] }
 * );
 * ```
 */
export function createErrorResponse(
  error: string,
  status = 500,
  code?: string,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    error,
    ...(code ? { code } : {}),
    ...(details !== undefined ? { details } : {}),
  };

  return NextResponse.json(body, { status });
}

/**
 * Create a validation error response for a specific field.
 *
 * @param field - The field that failed validation
 * @param message - Human-readable error message
 * @param value - Optional value that failed validation
 * @returns NextResponse with 400 status and validation error details
 *
 * @example
 * ```typescript
 * if (!email.includes('@')) {
 *   return createValidationError('email', 'Invalid email format', email);
 * }
 * ```
 */
export function createValidationError(
  field: string,
  message: string,
  value?: unknown,
): NextResponse<ApiErrorResponse> {
  const details: ValidationErrorDetails = {
    field,
    message,
    ...(value !== undefined && { value }),
  };

  return createErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', details);
}

/**
 * Create a validation error response for multiple fields.
 *
 * @param errors - Array of field validation errors
 * @returns NextResponse with 400 status and all validation errors
 *
 * @example
 * ```typescript
 * return createMultiFieldValidationError([
 *   { field: 'email', message: 'Email is required' },
 *   { field: 'password', message: 'Password must be at least 8 characters' }
 * ]);
 * ```
 */
export function createMultiFieldValidationError(
  errors: ValidationErrorDetails[],
): NextResponse<ApiErrorResponse> {
  return createErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', { errors });
}

/**
 * Create a success response for mutation operations.
 *
 * @param data - Optional response data
 * @param message - Optional success message
 * @returns NextResponse with 200 status and success format
 *
 * @example
 * ```typescript
 * return createSuccessResponse({ id: '123' }, 'User created successfully');
 * ```
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  });
}

/**
 * Common error response creators for frequently-used errors.
 */
export const commonErrors = {
  /**
   * 401 Unauthorized - Authentication required
   */
  unauthorized: (message = 'Authentication required'): NextResponse<ApiErrorResponse> =>
    createErrorResponse(message, 401, 'UNAUTHORIZED'),

  /**
   * 403 Forbidden - Authenticated but insufficient permissions
   */
  forbidden: (message = 'Insufficient permissions'): NextResponse<ApiErrorResponse> =>
    createErrorResponse(message, 403, 'FORBIDDEN'),

  /**
   * 404 Not Found - Resource does not exist
   */
  notFound: (resource = 'Resource'): NextResponse<ApiErrorResponse> =>
    createErrorResponse(`${resource} not found`, 404, 'NOT_FOUND'),

  /**
   * 409 Conflict - Resource already exists or conflict with current state
   */
  conflict: (message = 'Resource already exists'): NextResponse<ApiErrorResponse> =>
    createErrorResponse(message, 409, 'CONFLICT'),

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  rateLimitExceeded: (message = 'Rate limit exceeded'): NextResponse<ApiErrorResponse> =>
    createErrorResponse(message, 429, 'RATE_LIMIT_EXCEEDED'),

  /**
   * 500 Internal Server Error - Unexpected server error
   */
  internalError: (message = 'Internal server error'): NextResponse<ApiErrorResponse> =>
    createErrorResponse(message, 500, 'INTERNAL_ERROR'),

  /**
   * 503 Service Unavailable - Service temporarily unavailable
   */
  serviceUnavailable: (service = 'Service'): NextResponse<ApiErrorResponse> =>
    createErrorResponse(`${service} temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE'),
};

/**
 * Error codes used across the application.
 * Keep this in sync with client-side error handling.
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TRIAL_LIMIT_REACHED: 'TRIAL_LIMIT_REACHED',
  TRIAL_TOOL_LIMIT_REACHED: 'TRIAL_TOOL_LIMIT_REACHED',
  TRIAL_EMAIL_VERIFICATION_REQUIRED: 'TRIAL_EMAIL_VERIFICATION_REQUIRED',

  // Compliance
  COPPA_CONSENT_REQUIRED: 'COPPA_CONSENT_REQUIRED',
  PARENTAL_CONSENT_REQUIRED: 'PARENTAL_CONSENT_REQUIRED',
  AGE_VERIFICATION_REQUIRED: 'AGE_VERIFICATION_REQUIRED',

  // Services
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Trial/Abuse
  TRIAL_ABUSE_BLOCKED: 'TRIAL_ABUSE_BLOCKED',
  SESSION_BLOCKED: 'SESSION_BLOCKED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
