/**
 * Tests for RendererErrorBoundary
 *
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { RendererErrorBoundary, withErrorBoundary } from '../renderer-error-boundary';

// Component that throws an error
const ThrowingComponent = () => {
  throw new Error('Test error');
};

// Component that renders normally
const NormalComponent = () => <div>Normal content</div>;

describe('RendererErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error', () => {
    render(
      <RendererErrorBoundary>
        <NormalComponent />
      </RendererErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <RendererErrorBoundary>
        <ThrowingComponent />
      </RendererErrorBoundary>
    );
    expect(screen.getByText('Errore di visualizzazione')).toBeInTheDocument();
  });

  it('shows material type in error message when provided', () => {
    render(
      <RendererErrorBoundary materialType="mindmap">
        <ThrowingComponent />
      </RendererErrorBoundary>
    );
    expect(screen.getByText(/mindmap/)).toBeInTheDocument();
  });

  it('shows generic error message when materialType not provided', () => {
    render(
      <RendererErrorBoundary>
        <ThrowingComponent />
      </RendererErrorBoundary>
    );
    expect(screen.getByText('Impossibile visualizzare questo materiale.')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <RendererErrorBoundary>
        <ThrowingComponent />
      </RendererErrorBoundary>
    );
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('calls onReset when retry button clicked', () => {
    const onReset = vi.fn();
    render(
      <RendererErrorBoundary onReset={onReset}>
        <ThrowingComponent />
      </RendererErrorBoundary>
    );

    fireEvent.click(screen.getByText('Riprova'));
    expect(onReset).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(
      <RendererErrorBoundary>
        <ThrowingComponent />
      </RendererErrorBoundary>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('withErrorBoundary HOC', () => {
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('wraps component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(NormalComponent);
    render(<WrappedComponent />);
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('catches errors from wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent, 'test');
    render(<WrappedComponent />);
    expect(screen.getByText('Errore di visualizzazione')).toBeInTheDocument();
  });

  it('includes material type from HOC parameter', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent, 'quiz');
    render(<WrappedComponent />);
    expect(screen.getByText(/quiz/)).toBeInTheDocument();
  });
});
