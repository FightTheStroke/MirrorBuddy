import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LocaleProvider, useLocaleContext } from './locale-provider';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function Switcher() {
  const { switchLocale } = useLocaleContext();
  return <button onClick={() => switchLocale('fr')}>French</button>;
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('locale navigation', () => {
  it.each([
    ['/it/study-kit', '/fr/study-kit'],
    ['/en', '/fr'],
    ['/study-kit', '/fr/study-kit'],
  ])('switches %s through the app router to %s', (pathname, destination) => {
    vi.stubGlobal('location', { ...window.location, pathname, assign: vi.fn() });
    render(
      <LocaleProvider locale="it" messages={{}}>
        <Switcher />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'French' }));
    expect(push).toHaveBeenCalledExactlyOnceWith(destination);
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
