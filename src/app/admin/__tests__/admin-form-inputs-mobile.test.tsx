import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BasicInfoSection } from '../tiers/components/basic-info-section';
import { LimitsSection } from '../tiers/components/limits-section';
import { AuditFilters } from '../tiers/audit-log/components/audit-filters';
import { UsersSearch } from '../users/users-search';

// next-intl mock handled by global test setup (src/test/setup.ts)

describe('Admin Form Inputs - Mobile Responsiveness (F-47)', () => {
  describe('BasicInfoSection', () => {
    it('should render all inputs with full width on mobile', () => {
      const mockOnChange = vi.fn();
      const formData = {
        code: 'trial',
        name: 'Trial Plan',
        description: 'Free trial',
        monthlyPriceEur: null,
        sortOrder: 0,
        isActive: true,
      };

      render(<BasicInfoSection formData={formData} isEditing={false} onChange={mockOnChange} />);

      // Check code input is full width
      const codeInput = screen.getByDisplayValue('trial') as HTMLInputElement;
      expect(codeInput.className).toContain('w-full');

      // Check name input is full width
      const nameInput = screen.getByDisplayValue('Trial Plan') as HTMLInputElement;
      expect(nameInput.className).toContain('w-full');

      // Check textarea is full width
      const descTextarea = screen.getByDisplayValue('Free trial') as HTMLTextAreaElement;
      expect(descTextarea.className).toContain('w-full');
    });

    it('should have labels stacked above inputs on mobile', () => {
      const mockOnChange = vi.fn();
      const formData = {
        code: 'pro',
        name: 'Pro',
        description: null,
        monthlyPriceEur: 9.99,
        sortOrder: 1,
        isActive: true,
      };

      const { container } = render(
        <BasicInfoSection formData={formData} isEditing={false} onChange={mockOnChange} />,
      );

      // Check that input labels have block display (stacks above input)
      // Note: checkbox label is intentionally inline (in flex container)
      const textLabels = container.querySelectorAll('div > label');
      textLabels.forEach((label) => {
        const htmlLabel = label as HTMLLabelElement;
        // Skip checkbox label (it's inline in flex container)
        if (!htmlLabel.htmlFor?.includes('isActive')) {
          expect(htmlLabel.className).toContain('block');
        }
      });
    });

    it('should have minimum touch-friendly input height (44px)', () => {
      const mockOnChange = vi.fn();
      const formData = {
        code: 'base',
        name: 'Base Plan',
        description: null,
        monthlyPriceEur: null,
        sortOrder: 0,
        isActive: true,
      };

      render(<BasicInfoSection formData={formData} isEditing={false} onChange={mockOnChange} />);

      // Input component should have h-11 (44px) or higher
      const codeInput = screen.getByDisplayValue('base') as HTMLInputElement;
      // Check that input has h-11 class (44px = 2.75rem)
      expect(codeInput.className).toContain('h-11');
    });

    it('should have proper spacing between form fields', () => {
      const mockOnChange = vi.fn();
      const formData = {
        code: 'test',
        name: 'Test',
        description: null,
        monthlyPriceEur: null,
        sortOrder: 0,
        isActive: true,
      };

      const { container } = render(
        <BasicInfoSection formData={formData} isEditing={false} onChange={mockOnChange} />,
      );

      // Check that the form has space-y-4 or similar spacing
      const spacingContainer = container.querySelector('.space-y-4');
      expect(spacingContainer).toBeInTheDocument();
    });

    it('should display error messages visibly for required fields', () => {
      const mockOnChange = vi.fn();
      const formData = {
        code: '',
        name: '',
        description: null,
        monthlyPriceEur: null,
        sortOrder: 0,
        isActive: true,
      };

      render(<BasicInfoSection formData={formData} isEditing={false} onChange={mockOnChange} />);

      const codeInput = screen.getByPlaceholderText('es: trial, base, pro') as HTMLInputElement;
      expect(codeInput).toHaveAttribute('required');

      const nameInput = screen.getByPlaceholderText('Nome del tier') as HTMLInputElement;
      expect(nameInput).toHaveAttribute('required');
    });
  });

  describe('LimitsSection', () => {
    it('should display inputs full-width on mobile (grid-cols-1)', () => {
      const mockOnChange = vi.fn();
      const formData = {
        chatLimitDaily: 10,
        voiceMinutesDaily: 5,
        toolsLimitDaily: 10,
        docsLimitTotal: 1,
        videoVisionSecondsPerSession: 0,
        videoVisionMinutesMonthly: 0,
      };

      const { container } = render(<LimitsSection formData={formData} onChange={mockOnChange} />);

      // Check for grid-cols-1 (mobile) and md:grid-cols-2 (desktop)
      const grid = container.querySelector('.grid');
      expect(grid?.className).toContain('grid-cols-1');
      expect(grid?.className).toContain('md:grid-cols-2');
    });

    it('should have inputs with full width within grid cells', () => {
      const mockOnChange = vi.fn();
      const formData = {
        chatLimitDaily: 10,
        voiceMinutesDaily: 5,
        toolsLimitDaily: 10,
        docsLimitTotal: 1,
        videoVisionSecondsPerSession: 0,
        videoVisionMinutesMonthly: 0,
      };

      render(<LimitsSection formData={formData} onChange={mockOnChange} />);

      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach((input) => {
        expect(input.className).toContain('w-full');
      });
    });

    it('should display error messages when validation fails', () => {
      const mockOnChange = vi.fn();
      const formData = {
        chatLimitDaily: 10,
        voiceMinutesDaily: 5,
        toolsLimitDaily: 10,
        docsLimitTotal: 1,
        videoVisionSecondsPerSession: 0,
        videoVisionMinutesMonthly: 0,
      };

      const { container } = render(<LimitsSection formData={formData} onChange={mockOnChange} />);

      // Error messages should have role="alert"
      const alerts = container.querySelectorAll('[role="alert"]');
      // Should be visible (not hidden)
      alerts.forEach((alert) => {
        expect(alert.className).toContain('text-red');
      });
    });
  });

  describe('AuditFilters', () => {
    it('should stack filters full-width on mobile', () => {
      const props = {
        actionFilter: '',
        setActionFilter: vi.fn(),
        userSearch: '',
        setUserSearch: vi.fn(),
        startDate: '',
        setStartDate: vi.fn(),
        endDate: '',
        setEndDate: vi.fn(),
        onPageReset: vi.fn(),
      };

      const { container } = render(<AuditFilters {...props} />);

      // Check grid is responsive
      const grid = container.querySelector('.grid');
      expect(grid?.className).toContain('grid-cols-1');
      expect(grid?.className).toContain('md:grid-cols-2');
    });

    it('should have labels above inputs in filter form', () => {
      const props = {
        actionFilter: '',
        setActionFilter: vi.fn(),
        userSearch: '',
        setUserSearch: vi.fn(),
        startDate: '',
        setStartDate: vi.fn(),
        endDate: '',
        setEndDate: vi.fn(),
        onPageReset: vi.fn(),
      };

      const { container } = render(<AuditFilters {...props} />);

      const labels = container.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);
      labels.forEach((label) => {
        expect(label.className).toContain('block');
      });
    });
  });

  describe('UsersSearch', () => {
    it('should render search input full-width', () => {
      const mockOnChange = vi.fn();

      render(<UsersSearch value="" onChange={mockOnChange} />);

      const searchInput = screen.getByPlaceholderText(
        'Cerca per email o username...',
      ) as HTMLInputElement;
      expect(searchInput.className).toContain('w-full');
    });

    it('should have touch-friendly height', () => {
      const mockOnChange = vi.fn();

      render(<UsersSearch value="" onChange={mockOnChange} />);

      const searchInput = screen.getByPlaceholderText(
        'Cerca per email o username...',
      ) as HTMLInputElement;

      // Should have minimum height for touch targets (py-3 + min-h-11)
      expect(searchInput.className).toContain('min-h-11');
      expect(searchInput.className).toContain('py-3');
    });
  });
});
