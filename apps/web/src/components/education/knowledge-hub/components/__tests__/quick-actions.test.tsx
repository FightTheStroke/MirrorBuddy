/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActions } from '../quick-actions';
import { getTranslation } from '@/test/i18n-helpers';

describe('QuickActions', () => {
  describe('Basic Rendering', () => {
    it('should render toolbar with proper aria-label', () => {
      render(<QuickActions />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'Azioni rapide');
    });

    it('should render no buttons when no callbacks provided', () => {
      render(<QuickActions />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar.querySelectorAll('button').length).toBe(0);
    });
  });

  describe('Create Material Button', () => {
    it('should render create material button when callback provided', () => {
      render(<QuickActions onCreateMaterial={vi.fn()} />);

      const button = screen.getByLabelText('Nuovo materiale');
      expect(button).toBeInTheDocument();
    });

    it('should show label text in normal mode', () => {
      render(<QuickActions onCreateMaterial={vi.fn()} compact={false} />);

      expect(screen.getByText('Nuovo materiale')).toBeInTheDocument();
    });

    it('should hide label text in compact mode', () => {
      render(<QuickActions onCreateMaterial={vi.fn()} compact={true} />);

      expect(screen.queryByText('Nuovo materiale')).not.toBeInTheDocument();
    });

    it('should call onCreateMaterial when clicked', () => {
      const onCreateMaterial = vi.fn();
      render(<QuickActions onCreateMaterial={onCreateMaterial} />);

      fireEvent.click(screen.getByLabelText('Nuovo materiale'));
      expect(onCreateMaterial).toHaveBeenCalled();
    });

    it('should have primary variant styling', () => {
      render(<QuickActions onCreateMaterial={vi.fn()} />);

      const button = screen.getByLabelText('Nuovo materiale');
      expect(button).toHaveClass('bg-accent-themed');
    });
  });

  describe('Upload File Button', () => {
    it('should render upload button when callback provided', () => {
      render(<QuickActions onUploadFile={vi.fn()} />);

      const button = screen.getByLabelText('Carica file');
      expect(button).toBeInTheDocument();
    });

    it('should show label text in normal mode', () => {
      render(<QuickActions onUploadFile={vi.fn()} compact={false} />);

      expect(
        screen.getByText(getTranslation('education.knowledgeHub.quickActions.uploadFile')),
      ).toBeInTheDocument();
    });

    it('should call onUploadFile when clicked', () => {
      const onUploadFile = vi.fn();
      render(<QuickActions onUploadFile={onUploadFile} />);

      fireEvent.click(screen.getByLabelText('Carica file'));
      expect(onUploadFile).toHaveBeenCalled();
    });
  });

  describe('Create Folder Button', () => {
    it('should render folder button when callback provided', () => {
      render(<QuickActions onCreateFolder={vi.fn()} />);

      const button = screen.getByLabelText('Nuova cartella');
      expect(button).toBeInTheDocument();
    });

    it('should call onCreateFolder when clicked', () => {
      const onCreateFolder = vi.fn();
      render(<QuickActions onCreateFolder={onCreateFolder} />);

      fireEvent.click(screen.getByLabelText('Nuova cartella'));
      expect(onCreateFolder).toHaveBeenCalled();
    });
  });

  describe('Create Tag Button', () => {
    it('should render tag button when callback provided', () => {
      render(<QuickActions onCreateTag={vi.fn()} />);

      const button = screen.getByLabelText('Nuovo tag');
      expect(button).toBeInTheDocument();
    });

    it('should call onCreateTag when clicked', () => {
      const onCreateTag = vi.fn();
      render(<QuickActions onCreateTag={onCreateTag} />);

      fireEvent.click(screen.getByLabelText('Nuovo tag'));
      expect(onCreateTag).toHaveBeenCalled();
    });
  });

  describe('Multiple Buttons', () => {
    it('should render all buttons when all callbacks provided', () => {
      render(
        <QuickActions
          onCreateMaterial={vi.fn()}
          onUploadFile={vi.fn()}
          onCreateFolder={vi.fn()}
          onCreateTag={vi.fn()}
        />,
      );

      expect(screen.getByLabelText('Nuovo materiale')).toBeInTheDocument();
      expect(screen.getByLabelText('Carica file')).toBeInTheDocument();
      expect(screen.getByLabelText('Nuova cartella')).toBeInTheDocument();
      expect(screen.getByLabelText('Nuovo tag')).toBeInTheDocument();
    });

    it('should maintain correct order', () => {
      render(
        <QuickActions
          onCreateMaterial={vi.fn()}
          onUploadFile={vi.fn()}
          onCreateFolder={vi.fn()}
          onCreateTag={vi.fn()}
        />,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveAttribute('aria-label', 'Nuovo materiale');
      expect(buttons[1]).toHaveAttribute('aria-label', 'Carica file');
      expect(buttons[2]).toHaveAttribute('aria-label', 'Nuova cartella');
      expect(buttons[3]).toHaveAttribute('aria-label', 'Nuovo tag');
    });
  });

  describe('Compact Mode', () => {
    it('should show tooltip on hover in compact mode', () => {
      render(<QuickActions onCreateMaterial={vi.fn()} compact={true} />);

      const button = screen.getByLabelText('Nuovo materiale');
      expect(button).toHaveAttribute('title', 'Nuovo materiale');
    });

    it('should not show tooltip in normal mode', () => {
      render(<QuickActions onCreateMaterial={vi.fn()} compact={false} />);

      const button = screen.getByLabelText('Nuovo materiale');
      expect(button).not.toHaveAttribute('title');
    });

    it('should apply smaller padding in compact mode', () => {
      render(<QuickActions onCreateMaterial={vi.fn()} compact={true} />);

      const button = screen.getByLabelText('Nuovo materiale');
      expect(button).toHaveClass('p-2');
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus styles', () => {
      render(<QuickActions onCreateMaterial={vi.fn()} />);

      const button = screen.getByLabelText('Nuovo materiale');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });

    it('should have aria-label on all buttons', () => {
      render(
        <QuickActions
          onCreateMaterial={vi.fn()}
          onUploadFile={vi.fn()}
          onCreateFolder={vi.fn()}
          onCreateTag={vi.fn()}
        />,
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<QuickActions onCreateMaterial={vi.fn()} className="custom-class" />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveClass('custom-class');
    });
  });
});
