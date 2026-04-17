import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let isPermissionError = false;
      try {
        if (this.state.error?.message.includes('Missing or insufficient permissions')) {
          isPermissionError = true;
        }
      } catch (e) {
        // ignore
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-zinc-200">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-6 mx-auto animate-pulse" />
          <h1 className="text-3xl font-bold text-white mb-4">Something went wrong</h1>
          <p className="text-zinc-400 max-w-md mx-auto mb-8">
            {isPermissionError 
              ? "We encountered a permissions error. This can happen if your session expired or you logged out. Please refresh the page to continue." 
              : "An unexpected error occurred in the application. We apologize for the inconvenience."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
