/**
 * Unit tests for the one-handed typing mode control inside TypingView.
 *
 * A student with hemiplegia or limited hand function must be able to switch
 * between full keyboard, left-hand-only and right-hand-only layouts.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TypingView } from '../TypingView';
import { useTypingStore } from '@/lib/stores';
import { getTranslation } from '@/test/i18n-helpers';

const modeLabel = (mode: 'both' | 'leftOnly' | 'rightOnly') =>
  getTranslation(`tools.typing.oneHanded.modes.${mode}.label`);

const nameContains = (label: string) => (accessibleName: string) => accessibleName.includes(label);

describe('TypingView one-handed mode', () => {
  beforeEach(() => {
    useTypingStore.setState({ currentHandMode: 'both' });
  });

  afterEach(() => {
    cleanup();
    useTypingStore.setState({ currentHandMode: 'both' });
  });

  it('renders the three hand modes next to the level and layout pickers', () => {
    render(<TypingView />);

    expect(
      screen.getByRole('button', { name: nameContains(modeLabel('both')) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: nameContains(modeLabel('leftOnly')),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: nameContains(modeLabel('rightOnly')),
      }),
    ).toBeInTheDocument();
  });

  it('marks the active mode with aria-pressed for screen readers', () => {
    useTypingStore.setState({ currentHandMode: 'right-only' });
    render(<TypingView />);

    expect(
      screen.getByRole('button', {
        name: nameContains(modeLabel('rightOnly')),
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: nameContains(modeLabel('both')) })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('stores the left-hand-only selection so the keyboard can apply it', async () => {
    const user = userEvent.setup();
    render(<TypingView />);

    await user.click(
      screen.getByRole('button', {
        name: nameContains(modeLabel('leftOnly')),
      }),
    );

    expect(useTypingStore.getState().currentHandMode).toBe('left-only');
  });

  it('stores the right-hand-only selection', async () => {
    const user = userEvent.setup();
    render(<TypingView />);

    await user.click(
      screen.getByRole('button', {
        name: nameContains(modeLabel('rightOnly')),
      }),
    );

    expect(useTypingStore.getState().currentHandMode).toBe('right-only');
  });

  it('returns to the full keyboard', async () => {
    useTypingStore.setState({ currentHandMode: 'left-only' });
    const user = userEvent.setup();
    render(<TypingView />);

    await user.click(screen.getByRole('button', { name: nameContains(modeLabel('both')) }));

    expect(useTypingStore.getState().currentHandMode).toBe('both');
  });

  it('is operable with the keyboard alone', async () => {
    const user = userEvent.setup();
    render(<TypingView />);

    const leftOnly = screen.getByRole('button', {
      name: nameContains(modeLabel('leftOnly')),
    });
    leftOnly.focus();
    expect(leftOnly).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(useTypingStore.getState().currentHandMode).toBe('left-only');
  });

  it('exposes the three modes as a labelled group for screen readers', () => {
    render(<TypingView />);

    const group = screen.getByRole('group', {
      name: getTranslation('tools.typing.oneHanded.title'),
    });
    expect(group).toBeInTheDocument();
    expect(group.querySelectorAll('[aria-pressed]')).toHaveLength(3);
  });
});
