/**
 * Tests for SafetyBlockExplanation.
 *
 * @vitest-environment jsdom
 *
 * Assertions read the REAL translation files (via getTranslation), so a
 * placeholder value like "Etichetta" would fail these tests rather than ship.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getTranslation } from '@/test/i18n-helpers';
import { SafetyBlockExplanation } from '../safety-block-explanation';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) =>
    getTranslation(`${namespace}.${key}`, values),
}));

describe('SafetyBlockExplanation', () => {
  it('renders the real localised copy for a mapped category (pii -> privacy)', () => {
    render(<SafetyBlockExplanation category="pii" />);

    expect(
      screen.getByText(getTranslation('safetyBlock.categories.privacy.title')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(getTranslation('safetyBlock.categories.privacy.message')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(getTranslation('safetyBlock.categories.privacy.action')),
    ).toBeInTheDocument();
  });

  it('announces politely without stealing focus (role=status, aria-live=polite)', () => {
    render(<SafetyBlockExplanation category="violence" />);

    const region = screen.getByTestId('safety-block-explanation');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    // It must not grab focus.
    expect(region).not.toHaveAttribute('autofocus');
    expect(document.activeElement).toBe(document.body);
  });

  it('maps a stem_* internal category to the single stem bucket', () => {
    render(<SafetyBlockExplanation category="stem_explosives" />);

    const region = screen.getByTestId('safety-block-explanation');
    expect(region).toHaveAttribute('data-category', 'stem');
    expect(
      screen.getByText(getTranslation('safetyBlock.categories.stem.title')),
    ).toBeInTheDocument();
  });

  it('falls back to the generic bucket for an unknown / undefined category', () => {
    const { rerender } = render(<SafetyBlockExplanation category="brand_new_filter" />);
    expect(screen.getByTestId('safety-block-explanation')).toHaveAttribute(
      'data-category',
      'generic',
    );

    rerender(<SafetyBlockExplanation category={undefined} />);
    expect(screen.getByTestId('safety-block-explanation')).toHaveAttribute(
      'data-category',
      'generic',
    );
  });

  it('never leaks the raw internal category into the DOM', () => {
    const raw = 'stem_explosives_tnt_recipe';
    render(<SafetyBlockExplanation category={raw} />);

    const region = screen.getByTestId('safety-block-explanation');
    expect(region.textContent).not.toContain(raw);
    expect(region.textContent).not.toContain('explosives');
    expect(region.getAttribute('data-category')).toBe('stem');
  });
});
