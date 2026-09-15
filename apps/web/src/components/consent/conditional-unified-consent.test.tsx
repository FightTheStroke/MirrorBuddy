import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { getClientIdentity, setClientIdentity, type ClientIdentity } from '@/lib/auth';
import { ConditionalUnifiedConsent } from './conditional-unified-consent';

const state = vi.hoisted(
  (): {
    completed: boolean;
    pathname: string | null;
  } => {
    return { completed: false, pathname: '/en' };
  },
);

vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('@/lib/stores/onboarding-store', () => ({
  useOnboardingStore: () => ({ hasCompletedOnboarding: state.completed }),
}));
vi.mock('./unified-consent-wall', () => ({
  UnifiedConsentWall: () => <div data-testid="terms-check" />,
}));

function renderGate() {
  return render(
    <ConditionalUnifiedConsent>
      <button>Study</button>
    </ConditionalUnifiedConsent>,
  );
}

describe('route-level terms enforcement', () => {
  beforeEach(() => {
    setClientIdentity({
      status: 'authenticated',
      userId: 'consent-test-user',
      role: 'USER',
      legacyOrigin: false,
      needsLegacyUpgrade: false,
    });
    state.completed = false;
    state.pathname = '/en';
  });
  afterEach(() => {
    cleanup();
    setClientIdentity({ status: 'anonymous' });
  });

  it.each(['it', 'en', 'fr', 'de', 'es'])(
    'checks terms on /%s before onboarding hydration completes',
    (locale) => {
      state.pathname = `/${locale}`;
      renderGate();
      expect(screen.getByTestId('terms-check')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Study' })).not.toBeInTheDocument();
    },
  );

  it('retains the terms check after onboarding hydrates', () => {
    const view = renderGate();
    state.completed = true;
    view.rerender(
      <ConditionalUnifiedConsent>
        <button>Study</button>
      </ConditionalUnifiedConsent>,
    );
    expect(screen.getByTestId('terms-check')).toBeInTheDocument();
  });

  it.each<ClientIdentity>([{ status: 'pending' }, { status: 'unavailable', reason: 'network' }])(
    'keeps identity recovery reachable while identity is $status',
    (identity) => {
      setClientIdentity(identity);
      renderGate();
      expect(screen.getByRole('button', { name: 'Study' })).toBeInTheDocument();
      expect(screen.queryByTestId('terms-check')).not.toBeInTheDocument();
    },
  );

  it('checks terms immediately when a pending identity becomes authenticated', () => {
    const authenticated = getClientIdentity();
    setClientIdentity({ status: 'pending' });
    renderGate();
    act(() => setClientIdentity(authenticated));
    expect(screen.getByTestId('terms-check')).toBeInTheDocument();
  });

  it('preserves the anonymous onboarding redirect path', () => {
    setClientIdentity({ status: 'anonymous' });
    renderGate();
    expect(screen.getByRole('button', { name: 'Study' })).toBeInTheDocument();
    expect(screen.queryByTestId('terms-check')).not.toBeInTheDocument();
  });

  it('still checks terms for an onboarded anonymous visitor', () => {
    setClientIdentity({ status: 'anonymous' });
    state.completed = true;
    renderGate();
    expect(screen.getByTestId('terms-check')).toBeInTheDocument();
  });

  it.each([
    '/welcome',
    '/it/welcome',
    '/en/landing',
    '/fr/login',
    '/de/change-password',
    '/es/invite',
    '/privacy',
    '/en/privacy/details',
    '/fr/cookies',
    '/de/terms',
    '/es/ai-transparency',
    '/it/legal/data-request',
  ])('keeps the public or legal route %s accessible without consent', (pathname) => {
    state.pathname = pathname;
    state.completed = true;
    renderGate();
    expect(screen.getByRole('button', { name: 'Study' })).toBeInTheDocument();
    expect(screen.queryByTestId('terms-check')).not.toBeInTheDocument();
  });

  it.each(['/en/privacy-settings', '/terms-editor', null])(
    'does not treat %s as a public route',
    (pathname) => {
      state.pathname = pathname;
      renderGate();
      expect(screen.getByTestId('terms-check')).toBeInTheDocument();
    },
  );
});
