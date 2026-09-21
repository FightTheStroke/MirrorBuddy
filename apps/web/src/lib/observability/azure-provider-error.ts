/** Provider failures carry attribution, never credentials or response bodies. */
export class AzureProviderError extends Error {
  readonly status?: number;

  constructor(
    readonly operation: 'token' | 'metrics' | 'configuration',
    options: { status?: number; cause?: unknown; message?: string } = {},
  ) {
    super(
      options.message ??
        `Azure ${operation} failed${options.status === undefined ? '' : `: HTTP ${options.status}`}`,
      { cause: options.cause },
    );
    this.name = 'AzureProviderError';
    this.status = options.status;
  }
}
