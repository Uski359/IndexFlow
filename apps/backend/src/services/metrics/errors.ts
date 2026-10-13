export class MetricsNotAvailableError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'MetricsNotAvailableError';
    this.cause = cause;
  }
}
