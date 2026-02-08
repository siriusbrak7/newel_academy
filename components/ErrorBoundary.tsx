import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console for now; can be extended to remote logging
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error);
    // eslint-disable-next-line no-console
    console.error('Component stack:', info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV
        ? true
        : process.env.NODE_ENV === 'development';
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
          <div className="max-w-xl text-center">
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-white/80 mb-4">An unexpected error occurred. You can try reloading the page.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded border border-white/10"
              >
                Reload Page
              </button>
            </div>
            {isDev && this.state.error && (
              <div className="mt-6 text-left bg-black/30 border border-white/10 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Debug Details</div>
                <pre className="text-xs text-white/80 whitespace-pre-wrap">
                  {this.state.error.stack || this.state.error.message}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
