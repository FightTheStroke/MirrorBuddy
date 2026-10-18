/**
 * Regression tests: custom accessibility colors must not be able to break
 * out of the generated <style> block (CSS/HTML injection).
 */

import { describe, it, expect } from 'vitest';
import { getAccessibilityStyles } from '../styles';

describe('getAccessibilityStyles', () => {
  it('uses a valid custom background/text color as-is', () => {
    const css = getAccessibilityStyles({
      customBackgroundColor: '#123456',
      customTextColor: 'rgba(10, 20, 30, 0.5)',
    });
    expect(css).toContain('#123456');
    expect(css).toContain('rgba(10, 20, 30, 0.5)');
  });

  it('rejects a custom background color attempting to close the style tag', () => {
    const malicious = '#fff</style><script>alert(1)</script>';
    const css = getAccessibilityStyles({ customBackgroundColor: malicious });
    expect(css).not.toContain('</style><script>');
    expect(css).not.toContain('<script>');
  });

  it('rejects a custom text color attempting CSS injection with url()', () => {
    const malicious = 'red; } body { background: url("javascript:alert(1)")';
    const css = getAccessibilityStyles({ customTextColor: malicious });
    expect(css).not.toContain('javascript:');
    expect(css).not.toContain(malicious);
  });

  it('falls back to the default color when the value is unsafe', () => {
    const css = getAccessibilityStyles({ customBackgroundColor: 'evil;}</style>' });
    expect(css).toContain('#ffffff');
  });

  it('ignores a non-numeric line spacing that tries to close the style tag', () => {
    const malicious = '1.5;}</style><script>alert(1)</script>' as unknown as number;
    const css = getAccessibilityStyles({ lineSpacing: malicious });
    expect(css).not.toContain('<script>');
    expect(css).not.toContain('</style>');
    expect(css).toContain('line-height: 1.5;');
  });

  it('ignores a non-numeric font size', () => {
    const css = getAccessibilityStyles({ fontSize: '2;}</style>' as unknown as number });
    expect(css).not.toContain('</style>');
    expect(css).not.toContain('NaN');
  });

  it('keeps legitimate values and clamps extreme ones to a readable range', () => {
    expect(getAccessibilityStyles({ fontSize: 1.3, lineSpacing: 1.4 })).toContain(
      'line-height: 1.4;',
    );
    const css = getAccessibilityStyles({ fontSize: 100, lineSpacing: 50 });
    expect(css).toContain('font-size: 48px;');
    expect(css).toContain('line-height: 3;');
  });
});
