/** Group transport rejections by status, not potentially sensitive response bodies. */
export class MetricsPushError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`Metrics push rejected: HTTP ${status}`);
    this.name = 'MetricsPushError';
    this.status = status;
    this.responseBody = (responseBody ?? '').slice(0, 500);
  }
}
