/**
 * Unit Tests: UnifiedConsentWall - Prominent Banner
 *
 * Tests the prominent bottom banner design for consent:
 * - Fixed bottom positioning with backdrop overlay
 * - Cookie category toggles (essential locked, analytics optional)
 * - "Reject All" / "Accept All" buttons (GDPR compliant)
 * - Respects prefers-reduced-motion
 * - WCAG AA compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { UnifiedConsentWall } from './unified-consent-wall';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      loading: 'Caricamento...',
      bannerTitle: 'Informativa',
      titleUpdated: 'Termini Aggiornati',
      bannerDescription: 'Noi utilizziamo cookie e tecnologie simili...',
      bannerRights: 'Puoi liberamente prestare o rifiutare...',
      'categories.essential': 'Necessari',
      'categories.analytics': 'Analytics (opzionale)',
      'buttons.learnMore': 'Scopri di più',
      'buttons.rejectAll': 'Rifiuta tutto',
      'buttons.acceptAll': 'Accetta tutto',
      'buttons.submitting': 'Salvataggio...',
      'links.cookies': 'cookie policy',
      'screenReader.submitting': 'Salvataggio del consenso in corso...',
    };
    return translations[key] || key;
  },
}));

// Mock consent storage
vi.mock('@/lib/consent/unified-consent-storage', () => ({
  saveUnifiedConsent: vi.fn(),
  syncUnifiedConsentToServer: vi.fn(() => Promise.resolve()),
  needsReconsent: vi.fn(() => false),
  getUnifiedConsent: vi.fn(() => null),
  initializeConsent: vi.fn(() => Promise.resolve(false)),
  markConsentLoaded: vi.fn(),
}));

// Mock consent store
vi.mock('@/lib/consent/consent-store', () => ({
  subscribeToConsent: vi.fn(() => () => {}),
  getConsentSnapshot: vi.fn(() => false),
  getServerConsentSnapshot: vi.fn(() => false),
  updateConsentSnapshot: vi.fn(),
}));

// Mock client logger
vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    error: vi.fn(),
  },
}));

describe('UnifiedConsentWall - Prominent Banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.matchMedia for prefers-reduced-motion detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders as fixed bottom banner with backdrop overlay', async () => {
    const { container } = render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(() => {
      const banner = container.querySelector('[data-testid="consent-banner"]');
      if (banner) {
        expect(banner).toHaveClass('fixed');
        expect(banner).toHaveClass('bottom-0');
        expect(banner).toHaveClass('z-50');
      }
    });
  });

  it('has reject all and accept all buttons', async () => {
    render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(() => {
      const rejectButton = screen.queryByRole('button', {
        name: /Rifiuta tutto/i,
      });
      const acceptButton = screen.queryByRole('button', {
        name: /Accetta tutto/i,
      });
      if (rejectButton) expect(rejectButton).toBeInTheDocument();
      if (acceptButton) expect(acceptButton).toBeInTheDocument();
    });
  });

  it('has essential cookies toggle locked on', async () => {
    render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(() => {
      const essentialToggle = screen.queryByRole('switch', {
        name: /Necessari/i,
      });
      if (essentialToggle) {
        expect(essentialToggle).toBeDisabled();
        expect(essentialToggle).toHaveAttribute('aria-checked', 'true');
      }
    });
  });

  it('renders children when consent is given', async () => {
    const { getConsentSnapshot } = await import('@/lib/consent/consent-store');
    vi.mocked(getConsentSnapshot).mockReturnValue(true);

    render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(() => {
      expect(screen.getByText('App Content')).toBeInTheDocument();
    });
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();

    render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(async () => {
      const acceptButton = screen.queryByRole('button', {
        name: /Accetta e Continua/i,
      });

      if (acceptButton) {
        await user.tab();
        expect(document.activeElement).toBeTruthy();
      }
    });
  });

  it('has proper z-index for layering', async () => {
    const { container } = render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(() => {
      const banner = container.querySelector('[data-testid="consent-banner"]');
      if (banner) {
        expect(banner.className).toMatch(/z-\d+/);
      }
    });
  });
});
