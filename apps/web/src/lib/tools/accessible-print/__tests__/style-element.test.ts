/**
 * Defense in depth: whatever CSS the style builder returns, the generated
 * print page must never let it close the <style> element (CodeQL
 * js/html-constructed-from-input on the <style> interpolation).
 */

import { describe, it, expect, vi } from 'vitest';
import { generateAccessibleHtml } from '../../accessible-print';

vi.mock('../styles', () => ({
  getAccessibilityStyles: () => 'body { color: red; }</style><script>alert(1)</script>',
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe('generateAccessibleHtml <style> element', () => {
  it('cannot be closed early by the generated CSS', () => {
    const html = generateAccessibleHtml({
      title: 'Test',
      contentType: 'summary',
      content: { topic: 'Topic', sections: [] },
      accessibility: {},
    });

    expect(html.match(/<\/style>/g)).toHaveLength(1);
    expect(html).not.toContain('<script>');
    expect(html).toContain('body { color: red; }');
  });
});
