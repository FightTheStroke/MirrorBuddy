"use client";

/**
 * Error Boundary for Knowledge Hub Renderers
 *
 * Catches rendering errors in material renderers and displays
 * a user-friendly error message instead of crashing.
 */

import { Component, type ReactNode, type ErrorInfo } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

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
interface RendererErrorBoundaryWithTranslationsProps extends RendererErrorBoundaryProps {
  t?: (key: string, opts?: Record<string, string | number>) => string;
}

class RendererErrorBoundaryCore extends Component<
  RendererErrorBoundaryWithTranslationsProps,
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
    logger.error(
      "Renderer error",
      {
        materialType: this.props.materialType,
        errorName: error.name,
        errorMessage: error.message,
        componentStack: errorInfo.componentStack,
      },
      error,
    );
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { materialType, className, t } = this.props;
      const errorTitle = t
        ? t("renderers.error-title")
        : "Errore di visualizzazione";
      const errorMessage = materialType
        ? t
          ? t("renderers.error-message-with-type", { type: materialType })
          : `Impossibile visualizzare il materiale di tipo "${materialType}".`
        : t
          ? t("renderers.error-message-default")
          : "Impossibile visualizzare questo materiale.";
      const retryLabel = t ? t("renderers.retry-button") : "Riprova";

      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center p-6 rounded-lg",
            "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
            className,
          )}
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle
            className="w-12 h-12 text-red-500 mb-4"
            aria-hidden="true"
          />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            {errorTitle}
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 text-center mb-4">
            {errorMessage}
          </p>
          {this.state.error && (
            <p className="text-xs text-red-500 dark:text-red-400 font-mono mb-4 max-w-md truncate">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg",
              "bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300",
              "hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
            )}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            {retryLabel}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper that provides translations to error boundary
 */
function RendererErrorBoundary(
  props: RendererErrorBoundaryProps,
): React.ReactNode {
  const t = useTranslations("education.knowledge-hub");
  return <RendererErrorBoundaryCore {...props} t={t} />;
}

/**
 * HOC to wrap a renderer with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  materialType?: string,
): React.FC<P & { className?: string }> {
  const WithErrorBoundary: React.FC<P & { className?: string }> = (props) => (
    <RendererErrorBoundary
      materialType={materialType}
      className={props.className}
    >
      <WrappedComponent {...props} />
    </RendererErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithErrorBoundary;
}

// Export the functional wrapper as the default
export { RendererErrorBoundary };
