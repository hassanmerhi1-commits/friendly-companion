import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { useConnectionStore, type ConnectionState } from '@/lib/connection-store';
import { forceReconnect } from '@/lib/db-live';
import { cn } from '@/lib/utils';

function isElectron() {
  return typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
}

// Only show on non-Electron (browser/PWA) clients
export function ConnectionStatusBar() {
  const { state, retryCount, serverName } = useConnectionStore();
  const [dismissed, setDismissed] = useState(false);
  
  // Auto-dismiss connected state after 3s
  useEffect(() => {
    if (state === 'connected') {
      setDismissed(false);
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setDismissed(false);
    }
  }, [state]);

  // Don't show in Electron or on lovable preview
  if (isElectron()) return null;
  const host = window.location.hostname;
  if (host.includes('lovable') || host === 'localhost' || host === '127.0.0.1') return null;
  
  if (dismissed && state === 'connected') return null;

  const config: Record<ConnectionState, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    connected: {
      bg: 'bg-green-500/90',
      text: 'text-white',
      icon: <Wifi className="h-3.5 w-3.5" />,
      label: `✅ Conectado${serverName ? ` — ${serverName}` : ''}`,
    },
    reconnecting: {
      bg: 'bg-yellow-500/90',
      text: 'text-black',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: `A reconectar...${retryCount > 1 ? ` (tentativa ${retryCount})` : ''}`,
    },
    offline: {
      bg: 'bg-red-500/90',
      text: 'text-white',
      icon: <WifiOff className="h-3.5 w-3.5" />,
      label: 'Sem ligação ao servidor',
    },
  };
  
  const c = config[state];

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium transition-all duration-300',
      c.bg, c.text
    )}>
      {c.icon}
      <span>{c.label}</span>
      {state !== 'connected' && (
        <button
          onClick={() => forceReconnect()}
          className="ml-2 flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Reconectar
        </button>
      )}
    </div>
  );
}
