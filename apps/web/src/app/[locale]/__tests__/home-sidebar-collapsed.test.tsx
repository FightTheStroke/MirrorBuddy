/**
 * HomeSidebar — collapsed / closed navigation semantics (R2)
 * @vitest-environment jsdom
 *
 * Two reproduced defects, both invisible to the existing expanded fixtures:
 *  1. Below `lg` the closed drawer is only translated off-canvas, so Shift+Tab
 *     still reached "Area Genitori" at x = -240 on a 375px viewport.
 *  2. The six navigation entries lose their label when collapsed, leaving
 *     icon-only buttons with no accessible name.
 *
 * The desktop collapsed rail (lg:w-20) is genuinely visible navigation and must
 * stay operable and named — it must NOT be excluded.
 *
 * jsdom cannot prove rendered focus traversal or geometry: this file asserts the
 * DOM/accessibility contract, the rendered keyboard regression lives in
 * e2e/home-sidebar-collapsed-focus.spec.ts.
 */

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Home as HomeIcon,
  GraduationCap,
  Backpack,
  Trophy,
  Calendar,
  Settings,
} from 'lucide-react';
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

type Listener = (event: MediaQueryListEvent) => void;

/** Minimal controllable matchMedia: jsdom ships none. */
function installViewport(desktop: boolean) {
  let isDesktop = desktop;
  const listeners = new Set<Listener>();
  window.matchMedia = ((query: string) => ({
    matches: query.includes('min-width: 1024px') ? isDesktop : false,
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    addListener: (listener: Listener) => listeners.add(listener),
    removeListener: (listener: Listener) => listeners.delete(listener),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  return {
    resizeTo(nextDesktop: boolean) {
      isDesktop = nextDesktop;
      act(() => {
        for (const listener of listeners) {
          listener({ matches: nextDesktop } as MediaQueryListEvent);
        }
      });
    },
  };
}

const childNavItems = [
  { id: 'intent' as const, label: 'Casa', icon: HomeIcon },
  { id: 'maestri' as const, label: 'Professori', icon: GraduationCap },
  { id: 'supporti' as const, label: 'I miei lavori', icon: Backpack },
  { id: 'progress' as const, label: 'I miei premi', icon: Trophy },
];

const grownUpNavItems = [
  { id: 'calendar' as const, label: 'Calendario', icon: Calendar },
  { id: 'settings' as const, label: 'Impostazioni', icon: Settings },
];

const allLabels = [...childNavItems, ...grownUpNavItems].map((item) => item.label);

const baseProps = {
  onToggle: vi.fn(),
  currentView: 'intent' as const,
  onViewChange: vi.fn().mockResolvedValue(undefined),
  navItems: childNavItems,
  grownUpNavItems,
  hasNewInsights: false,
  onParentAccess: vi.fn(),
};

const renderSidebar = (open: boolean) => render(<HomeSidebar {...baseProps} open={open} />);
const aside = () => document.querySelector('aside') as HTMLElement;

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  delete (window as Partial<Window>).matchMedia;
});

describe('HomeSidebar — accessible names independent of open state', () => {
  it.each([true, false])('names every navigation entry (open=%s)', (open) => {
    installViewport(false);
    renderSidebar(open);

    for (const label of allLabels) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('keeps exactly one accessible name per entry when expanded', () => {
    installViewport(true);
    renderSidebar(true);

    for (const label of allLabels) {
      expect(screen.getAllByRole('button', { name: label })).toHaveLength(1);
    }
  });

  it('preserves navigation order in both states', () => {
    installViewport(true);
    const { rerender } = renderSidebar(true);

    const order = () =>
      Array.from(aside().querySelectorAll('button[data-testid^="home-nav-"]')).map((button) =>
        button.getAttribute('data-testid'),
      );
    const expected = [...childNavItems, ...grownUpNavItems].map((i) => `home-nav-${i.id}`);

    expect(order()).toEqual(expected);
    rerender(<HomeSidebar {...baseProps} open={false} />);
    expect(order()).toEqual(expected);
  });
});

describe('HomeSidebar — closed mobile drawer is excluded for real', () => {
  it('marks the closed drawer inert below the desktop breakpoint', () => {
    installViewport(false);
    renderSidebar(false);

    expect(aside()).toHaveAttribute('inert');
  });

  it('does not exclude the open mobile drawer', () => {
    installViewport(false);
    renderSidebar(true);

    expect(aside()).not.toHaveAttribute('inert');
  });

  it('never excludes the visible desktop collapsed rail', async () => {
    installViewport(true);
    renderSidebar(false);

    expect(aside()).not.toHaveAttribute('inert');

    const professors = screen.getByRole('button', { name: 'Professori' });
    professors.click();
    expect(baseProps.onViewChange).toHaveBeenCalledWith('maestri');
  });

  it('follows a viewport change while the sidebar stays closed', () => {
    const viewport = installViewport(false);
    renderSidebar(false);
    expect(aside()).toHaveAttribute('inert');

    viewport.resizeTo(true);
    expect(aside()).not.toHaveAttribute('inert');

    viewport.resizeTo(false);
    expect(aside()).toHaveAttribute('inert');
  });

  it('keeps the parent-area button named and gated by its handler', () => {
    installViewport(true);
    renderSidebar(false);

    const parentArea = screen.getByRole('button', { name: 'sidebar.parentArea' });
    parentArea.click();

    expect(baseProps.onParentAccess).toHaveBeenCalledTimes(1);
    expect(baseProps.onViewChange).not.toHaveBeenCalled();
  });
});
