import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px] bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
                Something went wrong
              </h3>
              {this.props.section && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  in {this.props.section}
                </p>
              )}
            </div>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 w-full max-w-md">
              <summary className="text-sm text-red-700 dark:text-red-300 cursor-pointer hover:underline">
                View error details
              </summary>
              <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-xs text-red-800 dark:text-red-200 overflow-x-auto max-h-32">
                {this.state.error.message}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping functional components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  section?: string
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary section={section || displayName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}

// Simple fallback for minor sections
export const MinimalErrorFallback: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex items-center gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-200/50 dark:border-red-800/50">
    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
    <span>{message || 'Failed to load this section'}</span>
  </div>
);

export default ErrorBoundary;

