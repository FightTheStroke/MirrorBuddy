/** Syntax check only. The server must still resolve and authorize the persisted session. */
export function requireNativeFixtureCookie(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^s2:[A-Za-z0-9_-]{43}\.[a-f0-9]{64}$/.test(value)) {
    throw new Error('An externally provisioned durable s2 fixture session is required');
  }
}
