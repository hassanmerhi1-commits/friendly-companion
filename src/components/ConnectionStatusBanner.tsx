// Global Connection Status Banner
// Shows connection status in client mode and blocks UI when offline

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { isElectron } from '@/lib/electron-storage';
import { isClientMode, getServerConnection } from '@/lib/remote-database';
import { useNetworkStore } from '@/stores/network-store';

export const ConnectionStatusBanner = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { config } = useNetworkStore();
  
  const isElectronApp = typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;

  useEffect(() => {
    if (!isElectronApp || config.mode !== 'client' || !config.serverIP) {
      setIsOnline(true);
      return;
    }

    // Check connection on mount and periodically
    const checkConnection = async () => {
      try {
        const result = await (window as any).electronAPI.network.pingServer(
          config.serverIP,
          config.serverPort
        );
        setIsOnline(result?.success === true);
        setLastError(result?.success ? null : (result?.error || 'Conexão falhou'));
      } catch (error: any) {
        setIsOnline(false);
        setLastError(error.message || 'Erro de conexão');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 15000); // Check every 15 seconds
    
    return () => clearInterval(interval);
  }, [isElectronApp, config.mode, config.serverIP, config.serverPort]);

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      const result = await (window as any).electronAPI.network.pingServer(
        config.serverIP,
        config.serverPort
      );
      setIsOnline(result?.success === true);
      setLastError(result?.success ? null : (result?.error || 'Conexão falhou'));
    } catch (error: any) {
      setIsOnline(false);
      setLastError(error.message || 'Erro de conexão');
    }
    setIsChecking(false);
  };

  // Don't show anything if not in client mode
  if (!isElectronApp || config.mode !== 'client' || !config.serverIP) {
    return null;
  }

  // Show offline banner
  if (!isOnline) {
    return (
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 bg-red-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="text-white font-medium font-mono">
              OFFLINE - \\{config.serverIP}\PayrollAO não acessível
              {lastError && <span className="ml-2 opacity-80 font-sans">• {lastError}</span>}
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-80">Edições bloqueadas</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isChecking}
              className="border-white text-white hover:bg-white/20"
            >
              {isChecking ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1">Tentar novamente</span>
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  // Optional: Show connected status briefly
  return null;
};

// Hook to check if edits should be blocked
export function useCanEdit(): { canEdit: boolean; errorMessage: string | null } {
  const [canEdit, setCanEdit] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { config, isConnected } = useNetworkStore();

  useEffect(() => {
    const isElectronApp = typeof window !== 'undefined' && 
      (window as any).electronAPI?.isElectron === true;

    if (!isElectronApp || config.mode !== 'client') {
      setCanEdit(true);
      setErrorMessage(null);
      return;
    }

    // In client mode, block edits if not connected
    setCanEdit(isConnected);
    setErrorMessage(isConnected ? null : 'Servidor offline. Edições bloqueadas.');
  }, [config.mode, isConnected]);

  return { canEdit, errorMessage };
}
