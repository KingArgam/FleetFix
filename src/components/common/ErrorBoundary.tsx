import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { getEnvironmentConfig, isDevelopment } from '../../config/environment';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    
    if (!isDevelopment()) {
      this.reportErrorToService(error, errorInfo);
    }
  }

  reportErrorToService(error: Error, errorInfo: ErrorInfo) {
    
    
    console.log('Would report error to service:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => alert('Error details copied to clipboard'))
      .catch(() => {
        
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(errorDetails, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Error details copied to clipboard');
      });
  };

  render() {
    if (this.state.hasError) {
      
      if (this.props.fallback) {
        return this.props.fallback;
      }

      
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-boundary-icon">
              <AlertTriangle size={64} className="text-error" />
            </div>
            
            <div className="error-boundary-content">
              <h1>Oops! Something went wrong</h1>
              <p className="error-boundary-message">
                We encountered an unexpected error. Don't worry, your data is safe. 
                Please try one of the options below.
              </p>

              <div className="error-boundary-actions">
                <button 
                  onClick={this.handleRetry}
                  className="btn btn-primary"
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
                
                <button 
                  onClick={this.handleReload}
                  className="btn btn-secondary"
                >
                  <RefreshCw size={16} />
                  Reload Page
                </button>
                
                <button 
                  onClick={this.handleGoHome}
                  className="btn btn-secondary"
                >
                  <Home size={16} />
                  Go to Dashboard
                </button>
              </div>

              {isDevelopment() && this.state.error && (
                <div className="error-boundary-debug">
                  <details>
                    <summary>
                      <Bug size={16} />
                      Debug Information (Development Mode)
                    </summary>
                    <div className="error-boundary-debug-content">
                      <div className="error-section">
                        <h4>Error ID:</h4>
                        <code>{this.state.errorId}</code>
                      </div>
                      
                      <div className="error-section">
                        <h4>Error Message:</h4>
                        <code>{this.state.error.message}</code>
                      </div>
                      
                      <div className="error-section">
                        <h4>Stack Trace:</h4>
                        <pre>{this.state.error.stack}</pre>
                      </div>
                      
                      {this.state.errorInfo && (
                        <div className="error-section">
                          <h4>Component Stack:</h4>
                          <pre>{this.state.errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                  
                  <button 
                    onClick={this.copyErrorDetails}
                    className="btn btn-outline"
                  >
                    Copy Error Details
                  </button>
                </div>
              )}

              {!isDevelopment() && (
                <div className="error-boundary-support">
                  <p>
                    If this problem persists, please contact support with error ID: 
                    <strong>{this.state.errorId}</strong>
                  </p>
                  <button 
                    onClick={this.copyErrorDetails}
                    className="btn btn-outline"
                  >
                    Copy Error ID
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}


export function useAsyncError() {
  const [, setError] = React.useState();
  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    []
  );
}


export const PageErrorBoundary: React.FC<{ children: ReactNode; pageName?: string }> = ({ 
  children, 
  pageName = 'page' 
}) => {
  const fallback = (
    <div className="page-error-fallback">
      <div className="page-error-content">
        <AlertTriangle size={48} className="text-error" />
        <h2>Error loading {pageName}</h2>
        <p>There was a problem loading this page. Please try refreshing or navigate to another page.</p>
        <div className="page-error-actions">
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            <RefreshCw size={16} />
            Refresh Page
          </button>
          <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary">
            <Home size={16} />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};
