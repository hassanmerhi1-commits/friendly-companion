import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  error?: string;
  releaseNotes?: string;
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;
}

export function UpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    if (!isElectron()) return;

    const api = (window as any).electronAPI;

    // Get current version
    api.updater.getVersion().then((version: string) => {
      setCurrentVersion(version);
    });

    // Listen for update status changes
    api.updater.onStatus((status: UpdateStatus) => {
      console.log('[Update] Status:', status);
      setUpdateStatus(status);

      // Show dialog when update is available or downloaded
      if (status.status === 'available' || status.status === 'downloaded') {
        setShowDialog(true);
      }
    });
  }, []);

  const handleDownload = async () => {
    if (!isElectron()) return;
    const api = (window as any).electronAPI;
    await api.updater.download();
  };

  const handleInstall = async () => {
    if (!isElectron()) return;
    const api = (window as any).electronAPI;
    api.updater.install();
  };

  const handleCheckForUpdates = async () => {
    if (!isElectron()) return;
    const api = (window as any).electronAPI;
    setUpdateStatus({ status: 'checking' });
    await api.updater.check();
  };

  // Don't render anything in browser mode
  if (!isElectron()) return null;

  // Render status badge in header/sidebar
  const renderStatusBadge = () => {
    if (!updateStatus) return null;

    switch (updateStatus.status) {
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>A verificar actualizações...</span>
          </div>
        );
      case 'downloading':
        return (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Download className="h-3 w-3" />
            <span>A transferir: {Math.round(updateStatus.percent || 0)}%</span>
          </div>
        );
      case 'downloaded':
        return (
          <Button 
            size="sm" 
            variant="default"
            className="h-7 text-xs bg-green-600 hover:bg-green-700"
            onClick={() => setShowDialog(true)}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Instalar v{updateStatus.version}
          </Button>
        );
      case 'available':
        return (
          <Button 
            size="sm" 
            variant="outline"
            className="h-7 text-xs border-blue-500 text-blue-600"
            onClick={() => setShowDialog(true)}
          >
            <Download className="h-3 w-3 mr-1" />
            Nova versão disponível
          </Button>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <XCircle className="h-3 w-3" />
            <span>Erro na actualização</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Status badge - to be placed in header/sidebar */}
      {renderStatusBadge()}

      {/* Update dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {updateStatus?.status === 'downloaded' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Actualização Pronta
                </>
              ) : updateStatus?.status === 'downloading' ? (
                <>
                  <Download className="h-5 w-5 text-blue-600" />
                  A Transferir Actualização
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                  Nova Versão Disponível
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                <span className="text-muted-foreground">Versão actual: </span>
                <span className="font-medium">{currentVersion}</span>
              </div>
              {updateStatus?.version && (
                <div>
                  <span className="text-muted-foreground">Nova versão: </span>
                  <span className="font-medium text-primary">{updateStatus.version}</span>
                </div>
              )}

              {updateStatus?.status === 'downloading' && (
                <div className="space-y-2 pt-2">
                  <Progress value={updateStatus.percent || 0} className="h-2" />
                  <p className="text-center text-sm">
                    {Math.round(updateStatus.percent || 0)}% concluído
                  </p>
                </div>
              )}

              {updateStatus?.status === 'downloaded' && (
                <p className="pt-2">
                  A actualização foi transferida. Reinicie a aplicação para instalar.
                </p>
              )}

              {updateStatus?.status === 'available' && (
                <p className="pt-2">
                  Uma nova versão do PayrollAO está disponível. Deseja transferir agora?
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {updateStatus?.status === 'available' && (
              <>
                <AlertDialogCancel>Mais tarde</AlertDialogCancel>
                <AlertDialogAction onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Transferir
                </AlertDialogAction>
              </>
            )}
            {updateStatus?.status === 'downloading' && (
              <AlertDialogCancel>A transferir...</AlertDialogCancel>
            )}
            {updateStatus?.status === 'downloaded' && (
              <>
                <AlertDialogCancel>Reiniciar depois</AlertDialogCancel>
                <AlertDialogAction onClick={handleInstall} className="bg-green-600 hover:bg-green-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reiniciar e Instalar
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Export a button for manual update check (to use in Settings)
export function CheckForUpdatesButton() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!isElectron()) {
      setResult('Apenas disponível na aplicação desktop');
      return;
    }

    setChecking(true);
    setResult(null);

    try {
      const api = (window as any).electronAPI;
      const response = await api.updater.check();
      
      if (response.success && response.updateInfo) {
        setResult(`Nova versão disponível: ${response.updateInfo.version}`);
      } else if (response.success) {
        setResult('Já tem a versão mais recente');
      } else {
        setResult(response.error || 'Erro ao verificar actualizações');
      }
    } catch (error) {
      setResult('Erro ao verificar actualizações');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button 
        onClick={handleCheck} 
        disabled={checking}
        variant="outline"
        className="w-full"
      >
        {checking ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            A verificar...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Verificar Actualizações
          </>
        )}
      </Button>
      {result && (
        <p className="text-sm text-muted-foreground text-center">{result}</p>
      )}
    </div>
  );
}
