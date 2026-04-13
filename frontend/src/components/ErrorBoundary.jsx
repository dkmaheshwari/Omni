import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Send error to monitoring service (if available)
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo);
    }
  }

  reportErrorToService = (error, errorInfo) => {
    // This would typically send to a service like Sentry, LogRocket, etc.
    console.error('Reporting error to monitoring service:', {
      error: error.message,
      stack: error.stack,
      errorInfo: errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Customizable error UI
      const { fallback: FallbackComponent, showDetails = false } = this.props;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
              <p className="text-gray-600 mb-6">
                We're sorry, but something unexpected happened. Please try again.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Reload Page
                </button>
              </div>

              {(showDetails || process.env.NODE_ENV === 'development') && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Show Error Details
                  </summary>
                  <div className="mt-2 p-4 bg-gray-50 rounded-md border">
                    <p className="text-sm text-red-600 font-mono mb-2">
                      {this.state.error.message}
                    </p>
                    <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  return function WithErrorBoundaryComponent(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for error reporting from function components
export const useErrorHandler = () => {
  const handleError = (error, errorInfo = {}) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // In a real app, you'd send this to your error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      console.error('Reporting error to monitoring service:', {
        error: error.message,
        stack: error.stack,
        errorInfo: errorInfo,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    }
  };

  return handleError;
};

// Custom error fallback components
export const MinimalErrorFallback = ({ error, retry }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
    <div className="text-red-600 text-sm font-medium mb-2">
      Something went wrong
    </div>
    <button
      onClick={retry}
      className="text-sm text-red-600 hover:text-red-800 underline"
    >
      Try again
    </button>
  </div>
);

export const ChatErrorFallback = ({ error, retry }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="text-red-500 text-4xl mb-4">💬</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Chat temporarily unavailable
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        We're having trouble loading the chat. Please try again.
      </p>
      <button
        onClick={retry}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
      >
        Retry
      </button>
    </div>
  </div>
);

export default ErrorBoundary;