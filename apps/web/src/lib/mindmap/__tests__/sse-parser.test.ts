import { describe, expect, it, vi } from 'vitest';
import { createSseParser } from '../sse-parser';

describe('bounded SSE framing', () => {
  it('handles LF, CR and CRLF with named events, comments, BOM and ignored retry fields', () => {
    const consume = vi.fn();
    const parser = createSseParser(consume);
    parser.push(
      new TextEncoder().encode(
        '\uFEFF: comment\r\rretry: 0\revent: mindmap:snapshot\rdata: {"value":\rdata: 1}\r\r',
      ),
    );
    parser.push(new TextEncoder().encode('data: {}\n\n'));
    parser.finish();
    expect(consume.mock.calls).toEqual([
      [{ event: 'mindmap:snapshot', data: '{"value":\n1}' }],
      [{ event: 'message', data: '{}' }],
    ]);
  });
  it('rejects incomplete frames rather than applying truncated content', () => {
    const consume = vi.fn();
    const parser = createSseParser(consume);
    parser.push(new TextEncoder().encode('event: mindmap:snapshot\ndata: {"partial":'));
    expect(() => parser.finish()).toThrow('Incomplete');
    expect(consume).not.toHaveBeenCalled();
  });
  it('bounds buffering for missing delimiters and rejects invalid UTF-8', () => {
    const parser = createSseParser(vi.fn());
    expect(() => parser.push(new TextEncoder().encode('x'.repeat(2 * 1024 * 1024 + 1)))).toThrow(
      '2 MiB',
    );
    expect(() =>
      createSseParser(vi.fn()).push(new TextEncoder().encode('\u00e9'.repeat(1024 * 1024 + 1))),
    ).toThrow('2 MiB');
    expect(() => createSseParser(vi.fn()).push(new Uint8Array([255]))).toThrow();
  });
});
