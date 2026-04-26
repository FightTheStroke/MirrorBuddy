/**
 * Request Tracing Module (F-21)
 *
 * Provides request ID generation and logging utilities
 * for distributed tracing across API routes.
 */

export {
  generateRequestId,
  getRequestId,
  getRequestLogger,
  getClientInfo,
  addRequestIdToResponse,
} from './request-id';
