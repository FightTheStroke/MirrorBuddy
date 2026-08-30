import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuoteRotator } from '../quote-rotator';
import { getMaestroQuotes, quoteSource, quoteText } from '@/data/maestri/quotes';

vi.mock('next-intl', () => ({
  useLocale: () => 'it',
  useTranslations: () => (key: string) => key,
}));

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? reduce : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }),
  });
}

const MAESTRO = 'euclide';
const quotes = getMaestroQuotes(MAESTRO, 'it');

describe('QuoteRotator', () => {
  beforeEach(() => {
    mockReducedMotion(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders a line for a maestro that has them', () => {
    render(<QuoteRotator maestroId={MAESTRO} />);
    expect(screen.getByText(rendered(quotes[0]))).toBeInTheDocument();
  });

  it('renders nothing for an unknown maestro', () => {
    const { container } = render(<QuoteRotator maestroId="nessuno" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('advances to the next line after the interval', () => {
    // compact avoids the exit animation, so the swap is observable synchronously
    render(<QuoteRotator maestroId={MAESTRO} rotationInterval={1000} compact clampLines={3} />);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByText(rendered(quotes[1]))).toBeInTheDocument();
  });

  it('does not advance when prefers-reduced-motion is set', () => {
    mockReducedMotion(true);
    render(<QuoteRotator maestroId={MAESTRO} rotationInterval={1000} compact clampLines={3} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(rendered(quotes[0]))).toBeInTheDocument();
  });

  it('does not advance when rotate is off', () => {
    render(
      <QuoteRotator
        maestroId={MAESTRO}
        rotationInterval={1000}
        rotate={false}
        compact
        clampLines={3}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(rendered(quotes[0]))).toBeInTheDocument();
  });

  it('shows the source next to a sourced quotation in compact mode', () => {
    const sourcedIndex = quotes.findIndex((q) => quoteSource(q) !== undefined);
    expect(sourcedIndex, 'fixture needs at least one sourced quotation').toBeGreaterThanOrEqual(0);
    const sourced = quotes[sourcedIndex];

    render(<QuoteRotator maestroId={MAESTRO} rotationInterval={1000} compact clampLines={3} />);
    act(() => {
      vi.advanceTimersByTime(1000 * sourcedIndex + 100);
    });

    expect(screen.getByText(quoteSource(sourced) as string)).toBeInTheDocument();
    // A quotation claims someone said it, so it earns quotation marks.
    expect(screen.getByText(`\u201C${quoteText(sourced)}\u201D`)).toBeInTheDocument();
  });

  it('shows an authored line without quotation marks', () => {
    const authoredIndex = quotes.findIndex((q) => quoteSource(q) === undefined);
    expect(authoredIndex, 'fixture needs at least one authored line').toBeGreaterThanOrEqual(0);

    render(<QuoteRotator maestroId={MAESTRO} rotationInterval={1000} compact />);
    act(() => {
      vi.advanceTimersByTime(1000 * authoredIndex + 100);
    });

    expect(screen.getByText(quoteText(quotes[authoredIndex]))).toBeInTheDocument();
  });
});

/** What the component is expected to print: quotation marks only when sourced. */
function rendered(quote: (typeof quotes)[number]): string {
  const text = quoteText(quote);
  return quoteSource(quote) === undefined ? text : `\u201C${text}\u201D`;
}
