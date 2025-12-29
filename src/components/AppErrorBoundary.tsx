import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Keep minimal logging; helps in Electron devtools when available.
    // eslint-disable-next-line no-console
    console.error("App crashed:", error);
  }

  private goToLogin = () => {
    window.location.hash = "#/login";
  };

  private forceActivation = () => {
    try {
      localStorage.removeItem("payroll_device_id");
      localStorage.removeItem("payroll_activation_date");
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private restartApp = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error?.message || "Unknown error";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="font-display">Erro inesperado</CardTitle>
            <CardDescription>
              A aplicação encontrou um erro e não conseguiu carregar este ecrã.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground">
              <div className="font-medium">Detalhes</div>
              <div className="mt-1 break-words text-muted-foreground">{message}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="secondary" onClick={this.goToLogin}>
                Ir para Login
              </Button>
              <Button variant="outline" onClick={this.forceActivation}>
                Forçar Activação
              </Button>
              <Button onClick={this.restartApp}>Reiniciar</Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Se isto acontecer depois do login, o “Detalhes” acima ajuda a
              identificar o problema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
