import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-surface-bright p-6">
          <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-display font-bold text-on-surface mb-2">Ops! Algo deu errado</h1>
            <p className="text-on-surface-variant mb-6 text-sm">
              Um erro inesperado aconteceu ao renderizar esta página. Já registramos o erro para investigação.
            </p>
            {this.state.error && (
              <div className="w-full bg-surface-container rounded-lg p-4 mb-6 text-left overflow-x-auto">
                <code className="text-xs text-red-500 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-primary-container text-white px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
