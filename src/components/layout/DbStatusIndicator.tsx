import { useState, useEffect } from 'react';
import { Database, Server, Monitor, Wifi, WifiOff } from 'lucide-react';
import { getSyncStatus } from '@/lib/db-live';

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
  wsServerRunning?: boolean;
  wsClients?: number;
  error?: string;
}

export function DbStatusIndicator() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState({ connected: false, url: null as string | null, connectedOnce: false });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!isElectron()) return;
      setIsLoading(true);
      try {
        const s = await (window as any).electronAPI.db.getStatus();
        setStatus(s);
        setSyncStatus(getSyncStatus());
      } catch (err) {
        console.error('Error fetching DB status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // refresh every 3s
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

  // WebSocket sync status
  const wsConnected = syncStatus.connected;
  const WsIcon = wsConnected ? Wifi : WifiOff;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono ${
      isConnected 
        ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
        : 'bg-red-500/10 text-red-600 border border-red-500/20'
    }`}>
      {/* DB Status */}
      <Database className="h-3.5 w-3.5" />
      <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'animate-pulse bg-yellow-500' : isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <ModeIcon className="h-3.5 w-3.5" />
      <span className="font-semibold">{mode}</span>
      <span className="text-muted-foreground">|</span>
      <span className="truncate max-w-[120px]" title={displayPath}>{displayPath}</span>
      
      {/* WebSocket Sync Status */}
      <span className="text-muted-foreground">|</span>
      <WsIcon className={`h-3.5 w-3.5 ${wsConnected ? 'text-green-500' : 'text-orange-500'}`} />
      <span className={wsConnected ? 'text-green-600' : 'text-orange-500'}>
        {wsConnected ? 'Sync' : 'Offline'}
      </span>
      
      {/* Server WS clients count */}
      {!status.isClient && status.wsServerRunning && (
        <>
          <span className="text-muted-foreground">|</span>
          <span className="text-blue-500">{status.wsClients || 0} clientes</span>
        </>
      )}
      
      {!isConnected && status.error && (
        <>
          <span className="text-muted-foreground">|</span>
          <span className="text-red-500 truncate max-w-[100px]" title={status.error}>{status.error}</span>
        </>
      )}
    </div>
  );
}
