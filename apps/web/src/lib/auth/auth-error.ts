import { ApiError } from '@/lib/api/pipe';

export class AuthenticationError extends ApiError {
  constructor(
    public readonly code:
      | 'AUTH_ABSENT'
      | 'SESSION_REJECTED'
      | 'SESSION_NOT_ACTIVATED'
      | 'SESSION_UNAVAILABLE',
  ) {
    super(
      code === 'SESSION_NOT_ACTIVATED'
        ? 'Session lifecycle has not been activated'
        : code === 'SESSION_UNAVAILABLE'
          ? 'Authentication service unavailable'
          : 'Authentication required',
      code === 'SESSION_NOT_ACTIVATED' || code === 'SESSION_UNAVAILABLE' ? 503 : 401,
      { code },
    );
  }
}
