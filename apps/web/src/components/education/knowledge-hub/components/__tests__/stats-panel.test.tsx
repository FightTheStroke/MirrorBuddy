/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsPanel, MaterialStats } from '../stats-panel';

const mockStats: MaterialStats = {
  totalMaterials: 25,
  byType: {
    mindmap: 5,
    quiz: 8,
    flashcard: 6,
    summary: 4,
    other: 2,
  },
  recentCount: 3,
  thisWeekCount: 12,
};

const emptyStats: MaterialStats = {
  totalMaterials: 0,
  byType: {
    mindmap: 0,
    quiz: 0,
    flashcard: 0,
    summary: 0,
    other: 0,
  },
  recentCount: 0,
  thisWeekCount: 0,
};

describe('StatsPanel', () => {
  describe('Basic Rendering', () => {
    it('should render stats panel region', () => {
      render(<StatsPanel stats={mockStats} />);

      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-label', 'Statistiche materiali');
    });

    it('should render header with title', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('Le tue statistiche')).toBeInTheDocument();
    });

    it('should display total materials count', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('25 materiali totali')).toBeInTheDocument();
    });
  });

  describe('Type Statistics', () => {
    it('should display mindmap count', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('Mappe mentali')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display quiz count', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('Quiz')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should display flashcard count', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('Flashcard')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('should display summary count', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('Riassunti')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Activity Statistics', () => {
    it('should display today count', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('Oggi:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display this week count', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('Questa settimana:')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display zero for empty stats', () => {
      render(<StatsPanel stats={emptyStats} />);

      expect(screen.getByText('0 materiali totali')).toBeInTheDocument();
    });

    it('should display zero counts for types', () => {
      render(<StatsPanel stats={emptyStats} />);

      // All type counts should be 0
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });

  describe('Icons', () => {
    it('should render brain icon for mindmaps', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      // Check SVG icon is present (Brain from lucide-react)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <StatsPanel stats={mockStats} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should have rounded border', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      expect(container.firstChild).toHaveClass('rounded-xl');
    });

    it('should have gradient header', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      const header = container.querySelector('.bg-gradient-to-r');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('should have 2-column grid for stats', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use blue color for mindmaps', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      const blueIcon = container.querySelector('.text-blue-500');
      expect(blueIcon).toBeInTheDocument();
    });

    it('should use green color for quizzes', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      const greenIcon = container.querySelector('.text-green-500');
      expect(greenIcon).toBeInTheDocument();
    });

    it('should use amber color for flashcards', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      const amberIcon = container.querySelector('.text-amber-500');
      expect(amberIcon).toBeInTheDocument();
    });

    it('should use purple color for summaries', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      const purpleIcon = container.querySelector('.text-purple-500');
      expect(purpleIcon).toBeInTheDocument();
    });
  });

  describe('Large Numbers', () => {
    it('should handle large total count', () => {
      const largeStats: MaterialStats = {
        ...mockStats,
        totalMaterials: 1000,
      };

      render(<StatsPanel stats={largeStats} />);

      expect(screen.getByText('1000 materiali totali')).toBeInTheDocument();
    });

    it('should handle large type counts', () => {
      const largeStats: MaterialStats = {
        ...mockStats,
        byType: {
          mindmap: 100,
          quiz: 200,
          flashcard: 150,
          summary: 75,
          other: 50,
        },
      };

      render(<StatsPanel stats={largeStats} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });
  });
});
