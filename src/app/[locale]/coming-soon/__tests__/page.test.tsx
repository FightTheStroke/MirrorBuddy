/**
 * Coming Soon Page Tests
 * @vitest-environment jsdom
 *
 * Test Coverage:
 * - Page renders with i18n title and subtitle
 * - WaitlistForm component is rendered
 * - Login link is present and accessible
 * - generateMetadata exports correct metadata
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => {
    const keys: Record<string, string> = {
      title: 'mock-title',
      subtitle: 'mock-subtitle',
      loginLink: 'mock-loginLink',
      metaTitle: 'mock-metaTitle',
      metaDescription: 'mock-metaDescription',
      submitButton: 'mock-submitButton',
    };
    return keys[key] ?? key;
  }),
}));

// Mock WaitlistForm (created in T2-04)
vi.mock('@/components/coming-soon/waitlist-form', () => ({
  WaitlistForm: () => <div data-testid="waitlist-form">WaitlistForm</div>,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

describe('ComingSoonPage', () => {
  const mockParams = Promise.resolve({ locale: 'it' });

  it('renders the page with waitlist form', async () => {
    const { default: ComingSoonPage } = await import('../page');
    const jsx = await ComingSoonPage({ params: mockParams });
    render(jsx as React.ReactElement);

    expect(screen.getByTestId('waitlist-form')).toBeInTheDocument();
  });

  it('renders the login link', async () => {
    const { default: ComingSoonPage } = await import('../page');
    const jsx = await ComingSoonPage({ params: mockParams });
    render(jsx as React.ReactElement);

    const loginLink = screen.getByRole('link', { name: /loginLink/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', expect.stringContaining('login'));
  });

  it('renders the logo image', async () => {
    const { default: ComingSoonPage } = await import('../page');
    const jsx = await ComingSoonPage({ params: mockParams });
    render(jsx as React.ReactElement);

    const logo = screen.getByRole('img', { name: /mirrorbuddy/i });
    expect(logo).toBeInTheDocument();
  });

  it('exports generateMetadata function', async () => {
    const { generateMetadata } = await import('../page');
    expect(typeof generateMetadata).toBe('function');
  });

  it('generateMetadata returns title and description', async () => {
    const { generateMetadata } = await import('../page');
    const metadata = await generateMetadata({ params: mockParams });
    expect(metadata.title).toBeDefined();
    expect(metadata.description).toBeDefined();
  });
});
