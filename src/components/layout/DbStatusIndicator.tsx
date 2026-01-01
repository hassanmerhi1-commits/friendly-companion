import { useState, useEffect } from 'react';
import { Database, Server, Monitor } from 'lucide-react';

function isElectron() {
  return typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
}

interface DbStatus {
  configured: boolean;
  connected: boolean;
  exists: boolean;
  path: string | null;
  isClient: boolean;
  serverName: string | null;
  error?: string;
}

export function DbStatusIndicator() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!isElectron()) return;
      setIsLoading(true);
      try {
        const s = await (window as any).electronAPI.db.getStatus();
        setStatus(s);
      } catch (err) {
        console.error('Error fetching DB status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (!isElectron() || !status) {
    return null;
  }

  const isConnected = status.connected;
  const mode = status.isClient ? 'Cliente' : 'Servidor';
  const ModeIcon = status.isClient ? Monitor : Server;
  const displayPath = status.isClient 
    ? status.serverName || '—' 
    : status.path || '—';

  const statusText = isConnected 
    ? (status.isClient ? 'Ligado ao servidor' : 'Base de dados activa')
    : (status.error || 'Desconectado');

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono ${
      isConnected 
        ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
        : 'bg-red-500/10 text-red-600 border border-red-500/20'
    }`}>
      <Database className="h-3.5 w-3.5" />
      <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'animate-pulse bg-yellow-500' : isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <ModeIcon className="h-3.5 w-3.5" />
      <span className="font-semibold">{mode}</span>
      <span className="text-muted-foreground">|</span>
      <span className="truncate max-w-[150px]" title={displayPath}>{displayPath}</span>
      {!isConnected && status.error && (
        <>
          <span className="text-muted-foreground">|</span>
          <span className="text-red-500 truncate max-w-[150px]" title={status.error}>{status.error}</span>
        </>
      )}
    </div>
  );
}
