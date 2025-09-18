// Error Boundary Component
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Copy } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Error logging removed for production
    
    // Store error info in state
    this.setState({ errorInfo });
    
    // Send to error tracking service (e.g., Sentry)
    if (import.meta.env.VITE_SENTRY_DSN) {
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined
    });
    
    // Call onReset if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        // You could show a toast notification here
      })
      .catch(err => {
      });
  };
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Something went wrong</h2>
            <p className="text-gray-400 mb-6 text-center">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            
            {this.state.errorId && (
              <div className="mb-6 p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">Error ID:</span>
                  <code className="text-purple-400 text-sm">{this.state.errorId}</code>
                </div>
                {this.state.error?.message && (
                  <div className="text-red-400 text-sm">
                    {this.state.error.message}
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-3 text-center">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={this.copyErrorDetails}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Copy className="h-4 w-4" />
                Copy Error Details
              </button>
            </div>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left bg-gray-700 rounded-lg">
                <summary className="text-gray-400 cursor-pointer p-3 flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Developer Error Details
                </summary>
                <div className="p-3 border-t border-gray-600">
                  <div className="mb-3">
                    <h4 className="text-white font-medium mb-2">Error Message:</h4>
                    <pre className="text-xs text-red-400 bg-gray-900 p-2 rounded overflow-auto">
                      {this.state.error.message}
                    </pre>
                  </div>
                  <div className="mb-3">
                    <h4 className="text-white font-medium mb-2">Stack Trace:</h4>
                    <pre className="text-xs text-red-400 bg-gray-900 p-2 rounded overflow-auto max-h-40">
                  {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <h4 className="text-white font-medium mb-2">Component Stack:</h4>
                      <pre className="text-xs text-red-400 bg-gray-900 p-2 rounded overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}