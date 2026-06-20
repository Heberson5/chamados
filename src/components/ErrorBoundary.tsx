import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] captured error:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });
  reload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border rounded-xl p-6 shadow-lg text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ocorreu uma falha inesperada. Você pode tentar novamente ou recarregar a página.
            </p>
            {this.state.error?.message && (
              <pre className="text-[10px] text-left mt-3 p-2 bg-muted/40 rounded overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={this.reset} className="gap-2">
              Tentar novamente
            </Button>
            <Button onClick={this.reload} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Recarregar
            </Button>
          </div>
        </div>
      </div>
    );
  }
}