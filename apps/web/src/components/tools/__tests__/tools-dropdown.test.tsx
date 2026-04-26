/**
 * Unit tests for ToolsDropdown component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getTranslation, getTranslationRegex } from '@/test/i18n-helpers';
import { ToolsDropdown } from '../tools-dropdown';

// Mock the widget components
vi.mock('@/components/calculator', () => ({
  CalculatorHeaderWidget: () => <div data-testid="calculator-widget">Calculator</div>,
}));

vi.mock('@/components/ambient-audio', () => ({
  AmbientAudioHeaderWidget: () => <div data-testid="ambient-audio-widget">Ambient Audio</div>,
}));

vi.mock('@/components/pomodoro', () => ({
  PomodoroHeaderWidget: () => <div data-testid="pomodoro-widget">Pomodoro</div>,
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      tools: 'Strumenti',
      calculator: 'Calcolatrice',
      ambientAudio: 'Audio Ambientale',
      pomodoro: 'Pomodoro Timer',
    };
    return translations[key] || key;
  },
}));

describe('ToolsDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the trigger button with Wrench icon', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });
      expect(button).toBeInTheDocument();
    });

    it('renders Wrench icon in trigger button', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('shows "Strumenti" label on trigger button', () => {
      render(<ToolsDropdown />);
      expect(screen.getByText(getTranslation('tools.title'))).toBeInTheDocument();
    });
  });

  describe('Dropdown Behavior', () => {
    it('opens dropdown when trigger is clicked', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });

      // Initially closed - widgets not visible
      expect(screen.queryByTestId('calculator-widget')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(button);

      // Now widgets should be visible
      expect(screen.getByTestId('calculator-widget')).toBeInTheDocument();
    });

    it('contains CalculatorHeaderWidget when open', () => {
      render(<ToolsDropdown />);
      fireEvent.click(screen.getByRole('button', { name: getTranslationRegex('tools.title') }));
      expect(screen.getByTestId('calculator-widget')).toBeInTheDocument();
    });

    it('contains AmbientAudioHeaderWidget when open', () => {
      render(<ToolsDropdown />);
      fireEvent.click(screen.getByRole('button', { name: getTranslationRegex('tools.title') }));
      expect(screen.getByTestId('ambient-audio-widget')).toBeInTheDocument();
    });

    it('contains PomodoroHeaderWidget when open', () => {
      render(<ToolsDropdown />);
      fireEvent.click(screen.getByRole('button', { name: getTranslationRegex('tools.title') }));
      expect(screen.getByTestId('pomodoro-widget')).toBeInTheDocument();
    });

    it('toggles dropdown on repeated clicks', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });

      // Open
      fireEvent.click(button);
      expect(screen.getByTestId('calculator-widget')).toBeInTheDocument();

      // Close
      fireEvent.click(button);
      expect(screen.queryByTestId('calculator-widget')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('trigger button is keyboard focusable', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('has proper aria-label on trigger button', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });
      expect(button).toHaveAccessibleName();
    });

    it('has aria-expanded attribute that reflects open state', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });

      // Initially closed
      expect(button).toHaveAttribute('aria-expanded', 'false');

      // Open dropdown
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      // Close dropdown
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('has aria-haspopup attribute on trigger button', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });

    it('closes dropdown when Escape key is pressed', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });

      // Open dropdown
      fireEvent.click(button);
      expect(screen.getByTestId('calculator-widget')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(button, { key: 'Escape', code: 'Escape' });

      // Dropdown should be closed
      expect(screen.queryByTestId('calculator-widget')).not.toBeInTheDocument();
    });

    it('dropdown menu has proper role attribute', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });

      // Open dropdown
      fireEvent.click(button);

      // Check for menu role (role="menu" or data-testid for verification)
      const dropdown = screen.getByTestId('calculator-widget').closest('div[role]');
      expect(dropdown).toBeInTheDocument();
    });

    it('chevron icon rotates when dropdown is open', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });

      // Get chevron (second svg in button)
      const svgs = button.querySelectorAll('svg');
      const chevron = svgs[1]; // First is Wrench, second is ChevronDown

      // Initially not rotated - check class attribute
      expect(chevron?.getAttribute('class')).not.toContain('rotate-180');

      // Open dropdown
      fireEvent.click(button);

      // Now should be rotated
      const svgsAfter = button.querySelectorAll('svg');
      const chevronAfter = svgsAfter[1];
      expect(chevronAfter?.getAttribute('class')).toContain('rotate-180');
    });
  });

  describe('Visual State', () => {
    it('changes color when dropdown is open', () => {
      render(<ToolsDropdown />);
      const button = screen.getByRole('button', { name: getTranslationRegex('tools.title') });

      // Initially inactive state
      expect(button.className).toContain('text-slate-500');

      // Open dropdown
      fireEvent.click(button);

      // Active state
      expect(button.className).toContain('text-blue-500');
    });
  });
});
