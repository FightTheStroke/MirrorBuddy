import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmptyStateTips } from '@/app/[locale]/supporti/components/components/empty-state-tips';
import { LearningPathsList } from '../learning-paths-list';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('current empty-state navigation', () => {
  it('takes an empty backpack to the current home intentions', () => {
    render(<EmptyStateTips show />);
    fireEvent.click(screen.getByRole('button'));

    expect(push).toHaveBeenCalledExactlyOnceWith('/');
    expect(screen.getByRole('button')).toHaveTextContent('emptyState.goToHome');
  });

  it('does not send an empty learning-path list to the retired study kit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ paths: [] }) }),
    );
    render(<LearningPathsList />);

    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveTextContent('goToHome');
  });
});
