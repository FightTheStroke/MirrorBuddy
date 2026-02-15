export class BaseError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(message: string, code = 'APP_ERROR', context?: Record<string, unknown>) {
    super(message);
    this.name = 'BaseError';
    this.code = code;
    this.context = context;
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}
