// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormulaRenderer, InlineFormula } from '../formula-renderer';

describe('FormulaRenderer', () => {
  it('renders LaTeX with the bundled KaTeX version without fetching a CDN stylesheet', async () => {
    const { container } = render(<FormulaRenderer request={{ latex: 'a^2 + b^2 = c^2' }} />);

    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull());
    expect(document.head.querySelector('link[href*="cdn.jsdelivr.net/npm/katex"]')).toBeNull();
  });

  it.each([
    ['block', (latex: string) => <FormulaRenderer request={{ latex }} />],
    ['inline', (latex: string) => <InlineFormula latex={latex} />],
  ])('does not trust links or HTML attributes in generated %s formulas', async (_, view) => {
    const { container } = render(
      view('\\href{https://example.com}{x} + \\htmlId{injected}{y} = \\text{ok}'),
    );

    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull());
    expect(container.querySelector('a[href]')).toBeNull();
    expect(container.querySelector('#injected')).toBeNull();
  });
});
