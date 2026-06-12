/**
 * HomeSidebar Component Tests
 * @vitest-environment jsdom
 *
 * COMP-01: child-space guardrails for the Trial flow.
 * Trial status, login and "request access" are adult account/commercial
 * surfaces: they must render ONLY inside the "for grown-ups" group, never at
 * the top of the sidebar where they visually address the child (focus group
 * FG-10: a 9-year-old cannot parse "Richiedi Accesso").
 */

import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Home as HomeIcon, GraduationCap } from 'lucide-react';
import { HomeSidebar } from '../home-sidebar';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: any) => <span data-testid="mock-image">{alt}</span>,
}));

vi.mock('@/components/conversation', () => ({
  ActiveMaestroAvatar: () => <div data-testid="active-maestro-avatar" />,
}));

vi.mock('@/components/trial', () => ({
  TrialStatusIndicator: () => <div data-testid="trial-status" />,
}));

vi.mock('@/components/branding/logo-brain', () => ({
  LogoBrain: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));

vi.mock('@/lib/hooks/use-admin-status', () => ({
  useAdminStatus: () => ({ isAdmin: false }),
}));

const trialStatus = {
  isTrialMode: true,
  chatsUsed: 3,
  chatsRemaining: 7,
  maxChats: 10,
  voiceSecondsUsed: 0,
  voiceSecondsRemaining: 300,
  maxVoiceSeconds: 300,
  toolsUsed: 0,
  toolsRemaining: 10,
  maxTools: 10,
};

const defaultProps = {
  open: true,
  onToggle: vi.fn(),
  currentView: 'intent' as const,
  onViewChange: vi.fn().mockResolvedValue(undefined),
  navItems: [{ id: 'intent' as const, label: 'Home', icon: HomeIcon }],
  grownUpNavItems: [{ id: 'maestri' as const, label: 'Professors', icon: GraduationCap }],
  hasNewInsights: false,
  onParentAccess: vi.fn(),
};

describe('HomeSidebar - Trial guardrails (COMP-01)', () => {
  it('renders the trial block ONLY inside the grown-ups group', () => {
    const { container } = render(<HomeSidebar {...defaultProps} trialStatus={trialStatus} />);

    const grownUpsGroup = container.querySelector('[data-testid="sidebar-grownups-group"]');
    const trialBlock = container.querySelector('[data-testid="sidebar-trial-grownups"]');

    expect(grownUpsGroup).toBeInTheDocument();
    expect(trialBlock).toBeInTheDocument();
    // The trial block (status + login + request access) is a descendant of the
    // grown-ups group — not a child-facing surface above the navigation.
    expect(grownUpsGroup!.contains(trialBlock)).toBe(true);
  });

  it('keeps every invite/login link inside the grown-ups group', () => {
    const { container } = render(<HomeSidebar {...defaultProps} trialStatus={trialStatus} />);

    const grownUpsGroup = container.querySelector('[data-testid="sidebar-grownups-group"]');
    const accountLinks = Array.from(container.querySelectorAll('a')).filter((a) => {
      const href = a.getAttribute('href') || '';
      return href.includes('invite') || href.includes('login');
    });

    expect(accountLinks.length).toBeGreaterThan(0);
    for (const link of accountLinks) {
      expect(grownUpsGroup!.contains(link)).toBe(true);
    }
  });

  it('renders no trial surfaces at all when not in trial mode', () => {
    const { container } = render(<HomeSidebar {...defaultProps} trialStatus={undefined} />);

    expect(
      container.querySelector('[data-testid="sidebar-trial-grownups"]'),
    ).not.toBeInTheDocument();
    const inviteLinks = Array.from(container.querySelectorAll('a')).filter((a) =>
      (a.getAttribute('href') || '').includes('invite'),
    );
    expect(inviteLinks).toHaveLength(0);
  });
});
