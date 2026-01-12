'use client';

/**
 * React Error Boundary for MirrorBuddy
 *
 * Catches React rendering errors and displays a fallback UI.
 * Logs errors for observability.
 *
 * Usage:
 *   <ErrorBoundary fallback={<ErrorFallback />}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */

import React, { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console in development, structured in production
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'React Error Boundary caught error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
    };

    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify(logData));
    } else {
      console.error('[ERROR] React Error Boundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  reset?: () => void;
}

export function DefaultErrorFallback({ error, reset }: ErrorFallbackProps): ReactNode {
  return (
    <div
      role="alert"
      className="flex min-h-[200px] flex-col items-center justify-center p-6 text-center"
    >
      <h2 className="mb-2 text-xl font-semibold text-red-600">
        Qualcosa non ha funzionato
      </h2>
      <p className="mb-4 text-gray-600">
        Si &egrave; verificato un errore imprevisto. Riprova pi&ugrave; tardi.
      </p>
      {process.env.NODE_ENV !== 'production' && error && (
        <pre className="mb-4 max-w-full overflow-auto rounded bg-gray-100 p-2 text-left text-xs">
          {error.message}
        </pre>
      )}
      {reset && (
        <button
          onClick={reset}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Riprova
        </button>
      )}
    </div>
  );
}

export default ErrorBoundary;
