import { useState, useEffect } from 'react';
import { Database, Server, Monitor, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  wsConnected?: boolean;
  error?: string;
}

interface DbStatusIndicatorProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function DbStatusIndicator({ variant = 'default', className }: DbStatusIndicatorProps) {
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
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!isElectron() || !status) {
    return null;
  }

  const isConnected = status.connected;
  const mode = status.isClient ? 'Cliente' : 'Servidor';
  const ModeIcon = status.isClient ? Monitor : Server;
  const displayPath = status.isClient ? status.serverName || '—' : status.path || '—';
  const wsConnected = status.isClient ? status.wsConnected : status.wsServerRunning;
  const WsIcon = wsConnected ? Wifi : WifiOff;

  const tooltip = [
    `BD: ${isConnected ? 'Ligada' : 'Desligada'}`,
    `${mode}: ${displayPath}`,
    `Sync: ${wsConnected ? 'Activo' : 'Offline'}`,
    !status.isClient && status.wsServerRunning ? `Clientes: ${status.wsClients || 0}` : null,
    !isConnected && status.error ? status.error : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const statusTone = isConnected
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
    : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25';

  const dotTone = isLoading
    ? 'bg-amber-500 animate-pulse'
    : isConnected
      ? 'bg-emerald-500'
      : 'bg-red-500';

  if (variant === 'compact') {
    return (
      <div
        className={cn('flex items-center gap-1.5 min-w-0', className)}
        title={tooltip}
      >
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border shrink-0',
            statusTone
          )}
        >
          <Database className="h-3 w-3 shrink-0" />
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotTone)} />
          <ModeIcon className="h-3 w-3 shrink-0" />
          <span className="font-semibold">{mode}</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border shrink-0',
            wsConnected
              ? 'bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
          )}
        >
          <WsIcon className="h-3 w-3 shrink-0" />
          <span>{wsConnected ? 'Sync' : 'Offline'}</span>
        </div>

        {!status.isClient && status.wsServerRunning && (
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 shrink-0">
            <span className="tabular-nums">{status.wsClients || 0}</span>
            <span>clientes</span>
          </div>
        )}

        <span
          className="hidden xl:inline text-[10px] text-muted-foreground truncate max-w-[180px]"
          title={displayPath}
        >
          {displayPath}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono border`,
        statusTone,
        className
      )}
      title={tooltip}
    >
      <Database className="h-3.5 w-3.5" />
      <span className={cn('w-1.5 h-1.5 rounded-full', dotTone)} />
      <ModeIcon className="h-3.5 w-3.5" />
      <span className="font-semibold">{mode}</span>
      <span className="text-muted-foreground">|</span>
      <span className="truncate max-w-[120px]" title={displayPath}>
        {displayPath}
      </span>
      <span className="text-muted-foreground">|</span>
      <WsIcon className={cn('h-3.5 w-3.5', wsConnected ? 'text-emerald-500' : 'text-amber-500')} />
      <span className={wsConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
        {wsConnected ? 'Sync' : 'Offline'}
      </span>
      {!status.isClient && status.wsServerRunning && (
        <>
          <span className="text-muted-foreground">|</span>
          <span className="text-blue-600 dark:text-blue-400">{status.wsClients || 0} clientes</span>
        </>
      )}
      {!isConnected && status.error && (
        <>
          <span className="text-muted-foreground">|</span>
          <span className="text-red-500 truncate max-w-[100px]" title={status.error}>
            {status.error}
          </span>
        </>
      )}
    </div>
  );
}
