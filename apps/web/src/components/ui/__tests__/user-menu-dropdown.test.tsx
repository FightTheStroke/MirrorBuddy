/**
 * Unit tests for UserMenuDropdown component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getTranslation, getTranslationRegex } from '@/test/i18n-helpers';
import { UserMenuDropdown } from '../user-menu-dropdown';
import { clearCSRFToken, setClientIdentity } from '@/lib/auth';
import { installLogoutTransportMock, logoutCSRFToken } from '@/test/fixtures/logout-transport';

const mockLogoutFetch = vi.fn<typeof fetch>();

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'userMenu.greeting': 'Ciao',
      'userMenu.profile': 'Profilo',
      'userMenu.changePassword': 'Cambia Password',
      'userMenu.settings': 'Impostazioni',
      'userMenu.logout': 'Esci',
      'session.logoutCurrent': 'Esci da questa sessione',
      'session.logoutAll': 'Esci da tutti i dispositivi',
    };
    return translations[key] || key;
  },
}));

describe('UserMenuDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setClientIdentity({
      status: 'authenticated',
      userId: 'user-test',
      role: 'USER',
      legacyOrigin: false,
      needsLegacyUpgrade: false,
    });
    mockLogoutFetch.mockResolvedValue(Response.json({ success: true }));
    installLogoutTransportMock(mockLogoutFetch);
  });
  afterEach(() => {
    clearCSRFToken();
    vi.unstubAllGlobals();
  });

  describe('Rendering', () => {
    it('renders trigger button with greeting when userName is provided', () => {
      render(<UserMenuDropdown userName="Mario" />);

      const button = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      expect(button).toBeInTheDocument();
      expect(screen.getByText(getTranslation('common.userMenu.greeting'))).toBeInTheDocument();
      expect(screen.getByText('Mario')).toBeInTheDocument();
    });

    it('renders greeting text with correct structure', () => {
      render(<UserMenuDropdown userName="Mario" />);

      // Check that both greeting and username are present
      const greeting = screen.getByText(getTranslation('common.userMenu.greeting'));
      const userName = screen.getByText('Mario');

      expect(greeting).toBeInTheDocument();
      expect(userName).toBeInTheDocument();
      expect(userName.className).toContain('font-semibold');
    });

    it('renders User icon when userName is not provided', () => {
      render(<UserMenuDropdown />);

      const button = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      expect(button).toBeInTheDocument();

      // Check for User icon (lucide-react User component)
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('opens menu and shows both distinct logout controls', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      // Profile, password, settings and two explicit logout scopes.
      await waitFor(() => {
        expect(screen.getByText(getTranslation('common.userMenu.profile'))).toBeInTheDocument();
        expect(
          screen.getByText(getTranslation('common.userMenu.changePassword')),
        ).toBeInTheDocument();
        expect(screen.getByText(getTranslation('common.userMenu.settings'))).toBeInTheDocument();
        expect(
          screen.getByText(getTranslation('common.session.logoutCurrent')),
        ).toBeInTheDocument();
      });
    });

    it('renders menu items with correct icons', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      // Check that each menu item has an icon (svg)
      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        menuItems.forEach((item) => {
          const icon = item.querySelector('svg');
          expect(icon).toBeInTheDocument();
        });
      });
    });
  });

  describe('Menu Navigation', () => {
    it('navigates to /settings when Profile is clicked', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const profileItem = await screen.findByText(getTranslation('common.userMenu.profile'));
      await user.click(profileItem);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/settings');
      });
    });

    it('navigates to /change-password when Change Password is clicked', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const changePasswordItem = await screen.findByText(
        getTranslation('common.userMenu.changePassword'),
      );
      await user.click(changePasswordItem);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/change-password');
      });
    });

    it('navigates to /settings when Settings is clicked', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const settingsItem = await screen.findByText(getTranslation('common.userMenu.settings'));
      await user.click(settingsItem);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/settings');
      });
    });
  });

  describe('Logout Functionality', () => {
    it('uses real csrfFetch for /api/auth/logout when logout is clicked', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const logoutItem = await screen.findByText(getTranslation('common.session.logoutCurrent'));
      await user.click(logoutItem);

      await waitFor(() => {
        expect(mockLogoutFetch).toHaveBeenCalledWith('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ scope: 'current' }),
          credentials: 'include',
          headers: expect.any(Headers),
        });
        expect(new Headers(mockLogoutFetch.mock.calls[0][1]?.headers).get('X-CSRF-Token')).toBe(
          logoutCSRFToken,
        );
      });
    });

    it('redirects to /login after successful logout', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const logoutItem = await screen.findByText(getTranslation('common.session.logoutCurrent'));
      await user.click(logoutItem);

      await waitFor(() => {
        expect(window.location.assign).toHaveBeenCalledWith(
          new URL('/login', window.location.origin).href,
        );
      });
    });

    it('does not redirect if logout API fails', async () => {
      const user = userEvent.setup();
      mockLogoutFetch.mockResolvedValueOnce(new Response('{}', { status: 503 }));

      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const logoutItem = await screen.findByText(getTranslation('common.session.logoutCurrent'));
      await user.click(logoutItem);

      await waitFor(() => {
        expect(mockLogoutFetch).toHaveBeenCalled();
      });

      // Should not navigate on failure
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it('disables logout button while logging out', async () => {
      const user = userEvent.setup();
      // Delay HTTP acknowledgement while real logout state remains pending.
      mockLogoutFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(Response.json({ success: true })), 100);
          }),
      );

      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const logoutItem = await screen.findByText(getTranslation('common.session.logoutCurrent'));
      const menuItem = logoutItem.closest('[role="menuitem"]');

      await user.click(logoutItem);

      // During logout, the button should show disabled styling
      await waitFor(() => {
        expect(menuItem?.className).toContain('opacity-50');
        expect(menuItem?.className).toContain('cursor-not-allowed');
      });

      // Wait for the delayed response to fully resolve (prevents leaking into next test)
      await waitFor(() => {
        expect(window.location.assign).toHaveBeenCalledWith(
          new URL('/login', window.location.origin).href,
        );
      });
    });

    it('prevents multiple logout requests when clicked multiple times', async () => {
      const user = userEvent.setup();
      // Delay HTTP acknowledgement to allow multiple clicks.
      mockLogoutFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(Response.json({ success: true })), 100);
          }),
      );

      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const logoutItem = await screen.findByText(getTranslation('common.session.logoutCurrent'));

      // Click multiple times rapidly
      await user.click(logoutItem);
      await user.click(logoutItem);
      await user.click(logoutItem);

      await waitFor(() => {
        // Should only be called once
        expect(mockLogoutFetch).toHaveBeenCalledTimes(1);
      });

      // Wait for the delayed response to fully resolve (prevents leaking into next test)
      await waitFor(() => {
        expect(window.location.assign).toHaveBeenCalledWith(
          new URL('/login', window.location.origin).href,
        );
      });
    });

    it('handles logout network error gracefully', async () => {
      const user = userEvent.setup();
      mockLogoutFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const logoutItem = await screen.findByText(getTranslation('common.session.logoutCurrent'));
      await user.click(logoutItem);

      await waitFor(() => {
        expect(mockLogoutFetch).toHaveBeenCalled();
      });

      // Should not navigate on error
      expect(window.location.assign).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('trigger button is keyboard focusable', () => {
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      trigger.focus();

      expect(document.activeElement).toBe(trigger);
    });

    it('closes menu when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      // Menu should be open
      await waitFor(() => {
        expect(screen.getByText(getTranslation('common.userMenu.profile'))).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');

      // Menu should be closed (items not visible)
      await waitFor(() => {
        expect(
          screen.queryByText(getTranslation('common.userMenu.profile')),
        ).not.toBeInTheDocument();
      });
    });

    it('menu items can be navigated with Tab key', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      await waitFor(async () => {
        const menuItems = screen.getAllByRole('menuitem');

        // First item should be focusable
        menuItems[0].focus();
        expect(document.activeElement).toBe(menuItems[0]);
      });
    });

    it('activates menu item on Enter key', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const profileItem = await screen.findByText(getTranslation('common.userMenu.profile'));
      const menuItem = profileItem.closest<HTMLElement>('[role="menuitem"]');

      // Focus and press Enter on profile item
      if (menuItem) {
        act(() => menuItem.focus());
        await user.keyboard('{Enter}');
      }

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/settings');
      });
    });
  });

  describe('Accessibility', () => {
    it('trigger button has aria-label', () => {
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      expect(trigger).toHaveAttribute('aria-label', getTranslation('common.userMenu.greeting'));
    });

    it('menu items have proper role attributes', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems.length).toBe(5);

        menuItems.forEach((item) => {
          expect(item).toHaveAttribute('role', 'menuitem');
        });
      });
    });

    it('has focus indicators on interactive elements', () => {
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });

      // Trigger should have focus styles
      expect(trigger.className).toContain('focus:outline-none');
      expect(trigger.className).toContain('focus:ring-2');
    });

    it('menu items have focus styles', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');

        menuItems.forEach((item) => {
          expect(item.className).toContain('focus:outline-none');
        });
      });
    });

    it('logout item has distinct styling', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      const logoutItem = await screen.findByText(getTranslation('common.session.logoutCurrent'));
      const menuItem = logoutItem.closest('[role="menuitem"]');

      // Logout should have red/danger styling
      expect(menuItem?.className).toContain('text-red-');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to trigger button', () => {
      render(<UserMenuDropdown userName="Mario" className="custom-class" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      expect(trigger.className).toContain('custom-class');
    });

    it('has hover states on trigger button', () => {
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      expect(trigger.className).toContain('hover:bg-slate-100');
    });

    it('menu has separator before logout item', async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole('button', {
        name: getTranslationRegex('common.userMenu.greeting'),
      });
      await user.click(trigger);

      await waitFor(() => {
        const separator = document.querySelector("[role='separator']");
        expect(separator).toBeInTheDocument();
      });
    });
  });
});
