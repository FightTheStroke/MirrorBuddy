'use client';

/**
 * Error Boundary for Knowledge Hub Renderers
 *
 * Catches rendering errors in material renderers and displays
 * a user-friendly error message instead of crashing.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface RendererErrorBoundaryProps {
  children: ReactNode;
  materialType?: string;
  className?: string;
  onReset?: () => void;
}

interface RendererErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches renderer errors and shows fallback UI.
 */
export class RendererErrorBoundary extends Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  constructor(props: RendererErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RendererErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    logger.error('Renderer error', {
      materialType: this.props.materialType,
      errorName: error.name,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
    }, error);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { materialType, className } = this.props;

      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center p-6 rounded-lg',
            'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
            className
          )}
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            Errore di visualizzazione
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 text-center mb-4">
            {materialType
              ? `Impossibile visualizzare il materiale di tipo "${materialType}".`
              : 'Impossibile visualizzare questo materiale.'}
          </p>
          {this.state.error && (
            <p className="text-xs text-red-500 dark:text-red-400 font-mono mb-4 max-w-md truncate">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300',
              'hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
            )}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Riprova
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a renderer with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  materialType?: string
): React.FC<P & { className?: string }> {
  const WithErrorBoundary: React.FC<P & { className?: string }> = (props) => (
    <RendererErrorBoundary materialType={materialType} className={props.className}>
      <WrappedComponent {...props} />
    </RendererErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundary;
}
