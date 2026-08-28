import { describe, it, expect } from 'vitest';
import { isUndeliveredRequest } from './undelivered-request';

describe('isUndeliveredRequest', () => {
  it('recognises an explicit abort', () => {
    expect(isUndeliveredRequest(new DOMException('aborted', 'AbortError'))).toBe(true);
  });

  it('recognises the browser wording for a dropped request', () => {
    expect(isUndeliveredRequest(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('recognises the Safari wording', () => {
    expect(isUndeliveredRequest(new TypeError('Load failed'))).toBe(true);
  });

  it('does not hide a fault raised inside the store', () => {
    expect(isUndeliveredRequest(new Error('Cannot read property name of undefined'))).toBe(false);
  });

  it('does not hide a malformed response', () => {
    expect(isUndeliveredRequest(new SyntaxError('Unexpected token < in JSON'))).toBe(false);
  });

  it('tolerates a non-error value', () => {
    expect(isUndeliveredRequest(undefined)).toBe(false);
  });
});
