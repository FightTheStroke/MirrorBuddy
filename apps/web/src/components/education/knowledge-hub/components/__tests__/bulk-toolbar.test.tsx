/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkToolbar } from '../bulk-toolbar';

describe('BulkToolbar', () => {
  describe('Visibility', () => {
    it('should not render when selectedCount is 0', () => {
      const { container } = render(
        <BulkToolbar
          selectedCount={0}
          onClearSelection={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when selectedCount is greater than 0', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
        />
      );

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('Selection Count Display', () => {
    it('should show singular text for 1 item', () => {
      render(
        <BulkToolbar
          selectedCount={1}
          onClearSelection={vi.fn()}
        />
      );

      expect(screen.getByText('1 selezionato')).toBeInTheDocument();
    });

    it('should show plural text for multiple items', () => {
      render(
        <BulkToolbar
          selectedCount={5}
          onClearSelection={vi.fn()}
        />
      );

      expect(screen.getByText('5 selezionati')).toBeInTheDocument();
    });
  });

  describe('Clear Selection', () => {
    it('should show clear selection button', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
        />
      );

      const clearButton = screen.getByLabelText('Deseleziona tutto');
      expect(clearButton).toBeInTheDocument();
    });

    it('should call onClearSelection when clicked', () => {
      const onClearSelection = vi.fn();
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={onClearSelection}
        />
      );

      fireEvent.click(screen.getByLabelText('Deseleziona tutto'));
      expect(onClearSelection).toHaveBeenCalled();
    });
  });

  describe('Move Action', () => {
    it('should show move button when onMove is provided', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onMove={vi.fn()}
        />
      );

      const moveButton = screen.getByLabelText('Sposta');
      expect(moveButton).toBeInTheDocument();
    });

    it('should not show move button when onMove is not provided', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
        />
      );

      expect(screen.queryByLabelText('Sposta')).not.toBeInTheDocument();
    });

    it('should call onMove when clicked', () => {
      const onMove = vi.fn();
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onMove={onMove}
        />
      );

      fireEvent.click(screen.getByLabelText('Sposta'));
      expect(onMove).toHaveBeenCalled();
    });
  });

  describe('Add Tags Action', () => {
    it('should show add tags button when onAddTags is provided', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onAddTags={vi.fn()}
        />
      );

      const addTagsButton = screen.getByLabelText('Aggiungi tag');
      expect(addTagsButton).toBeInTheDocument();
    });

    it('should call onAddTags when clicked', () => {
      const onAddTags = vi.fn();
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onAddTags={onAddTags}
        />
      );

      fireEvent.click(screen.getByLabelText('Aggiungi tag'));
      expect(onAddTags).toHaveBeenCalled();
    });
  });

  describe('Archive Action', () => {
    it('should show archive button when onArchive is provided and not in archive view', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onArchive={vi.fn()}
          isArchiveView={false}
        />
      );

      const archiveButton = screen.getByLabelText('Archivia');
      expect(archiveButton).toBeInTheDocument();
    });

    it('should not show archive button in archive view', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onArchive={vi.fn()}
          isArchiveView={true}
        />
      );

      expect(screen.queryByLabelText('Archivia')).not.toBeInTheDocument();
    });

    it('should call onArchive when clicked', () => {
      const onArchive = vi.fn();
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onArchive={onArchive}
        />
      );

      fireEvent.click(screen.getByLabelText('Archivia'));
      expect(onArchive).toHaveBeenCalled();
    });
  });

  describe('Restore Action', () => {
    it('should show restore button when onRestore is provided and in archive view', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onRestore={vi.fn()}
          isArchiveView={true}
        />
      );

      const restoreButton = screen.getByLabelText('Ripristina');
      expect(restoreButton).toBeInTheDocument();
    });

    it('should not show restore button when not in archive view', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onRestore={vi.fn()}
          isArchiveView={false}
        />
      );

      expect(screen.queryByLabelText('Ripristina')).not.toBeInTheDocument();
    });

    it('should call onRestore when clicked', () => {
      const onRestore = vi.fn();
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onRestore={onRestore}
          isArchiveView={true}
        />
      );

      fireEvent.click(screen.getByLabelText('Ripristina'));
      expect(onRestore).toHaveBeenCalled();
    });
  });

  describe('Delete Action', () => {
    it('should show delete button when onDelete is provided', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const deleteButton = screen.getByLabelText('Elimina');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should have danger styling', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const deleteButton = screen.getByLabelText('Elimina');
      expect(deleteButton).toHaveClass('text-red-600');
    });

    it('should call onDelete when clicked', () => {
      const onDelete = vi.fn();
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onDelete={onDelete}
        />
      );

      fireEvent.click(screen.getByLabelText('Elimina'));
      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe('Multiple Actions', () => {
    it('should render all action buttons when all callbacks provided', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onMove={vi.fn()}
          onAddTags={vi.fn()}
          onArchive={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Sposta')).toBeInTheDocument();
      expect(screen.getByLabelText('Aggiungi tag')).toBeInTheDocument();
      expect(screen.getByLabelText('Archivia')).toBeInTheDocument();
      expect(screen.getByLabelText('Elimina')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have toolbar role with proper aria-label', () => {
      render(
        <BulkToolbar
          selectedCount={5}
          onClearSelection={vi.fn()}
        />
      );

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'Azioni per 5 elementi selezionati');
    });

    it('should have aria-label on all action buttons', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onMove={vi.fn()}
          onAddTags={vi.fn()}
          onArchive={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have focus ring styles', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          onMove={vi.fn()}
        />
      );

      const moveButton = screen.getByLabelText('Sposta');
      expect(moveButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(
        <BulkToolbar
          selectedCount={3}
          onClearSelection={vi.fn()}
          className="custom-class"
        />
      );

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveClass('custom-class');
    });
  });
});
