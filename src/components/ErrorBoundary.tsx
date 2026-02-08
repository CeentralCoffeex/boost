'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Met à jour l'état pour afficher l'UI de fallback au prochain rendu
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log l'erreur pour le monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Appeler le callback d'erreur si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Envoyer l'erreur à un service de monitoring en production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
    
    this.setState({ errorInfo });
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Ici, vous pourriez envoyer l'erreur à un service comme Sentry, LogRocket, etc.
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    // Exemple d'envoi à une API de logging
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData),
    }).catch(err => {
      console.error('Failed to log error to service:', err);
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      // Utiliser le fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de fallback par défaut
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Oops! Quelque chose s'est mal passé</h2>
            <p>
              Une erreur inattendue s'est produite. Nous nous excusons pour la gêne occasionnée.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Détails de l'erreur (développement)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-button"
              >
                Réessayer
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="reload-button"
              >
                Recharger la page
              </button>
            </div>
          </div>
          
          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: 2rem;
              background-color: #f8f9fa;
              border-radius: 8px;
              margin: 1rem;
            }
            
            .error-boundary-content {
              text-align: center;
              max-width: 600px;
            }
            
            .error-boundary h2 {
              color: #dc3545;
              margin-bottom: 1rem;
              font-size: 1.5rem;
            }
            
            .error-boundary p {
              color: #6c757d;
              margin-bottom: 2rem;
              line-height: 1.6;
            }
            
            .error-details {
              text-align: left;
              margin: 1rem 0;
              padding: 1rem;
              background-color: #f1f3f4;
              border-radius: 4px;
              border: 1px solid #dee2e6;
            }
            
            .error-details summary {
              cursor: pointer;
              font-weight: bold;
              margin-bottom: 0.5rem;
            }
            
            .error-stack {
              font-family: 'Courier New', monospace;
              font-size: 0.875rem;
              white-space: pre-wrap;
              overflow-x: auto;
              color: #dc3545;
            }
            
            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              flex-wrap: wrap;
            }
            
            .retry-button,
            .reload-button {
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 500;
              transition: all 0.2s ease;
            }
            
            .retry-button {
              background-color: #007bff;
              color: white;
            }
            
            .retry-button:hover {
              background-color: #0056b3;
            }
            
            .reload-button {
              background-color: #6c757d;
              color: white;
            }
            
            .reload-button:hover {
              background-color: #545b62;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Hook pour capturer les erreurs dans les composants fonctionnels
export function useErrorHandler() {
  const handleError = (error: Error, errorInfo?: any) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // En production, envoyer l'erreur à un service de monitoring
    if (process.env.NODE_ENV === 'production') {
      const errorData = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...errorInfo,
      };
      
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(err => {
        console.error('Failed to log error to service:', err);
      });
    }
  };
  
  return { handleError };
}

// Composant wrapper pour les erreurs async
export function AsyncErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}