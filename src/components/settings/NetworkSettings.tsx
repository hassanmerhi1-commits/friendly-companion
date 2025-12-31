import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, RefreshCw, Monitor, HardDrive, CheckCircle2, XCircle } from "lucide-react";

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
};

interface DBStatus {
  configured: boolean;
  path: string | null;
  isClient: boolean;
  serverIP: string | null;
  exists: boolean;
  connected: boolean;
  error?: string;
}

export function NetworkSettings() {
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [localIPs, setLocalIPs] = useState<string[]>([]);
  const [ipFilePath, setIpFilePath] = useState<string>('');
  const [ipFileContent, setIpFileContent] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isElectron()) return;
    loadStatus();
  }, []);

  const loadStatus = async () => {
    if (!isElectron()) return;

    setIsRefreshing(true);
    try {
      const api = (window as any).electronAPI;

      // Get database status
      const status = await api.db.getStatus();
      setDbStatus(status);

      // Get IP file content
      const ipFile = await api.ipfile.read();
      setIpFileContent(ipFile?.content || '');

      // Get local IPs (for display)
      const ips = await api.network.getLocalIPs();
      setLocalIPs(ips);

      // Get IP file path
      const path = await api.network.getIPFilePath();
      setIpFilePath(path);
    } catch (error) {
      console.error('Error loading status:', error);
    }
    setIsRefreshing(false);
  };

  if (!isElectron()) {
    return (
      <Card className="border-2 border-muted">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Rede LAN / LAN Network</CardTitle>
              <CardDescription>Configurações de rede (apenas desktop)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            As configurações de rede estão disponíveis apenas na versão desktop do PayrollAO.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isClient = dbStatus?.isClient || false;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Rede LAN / LAN Network</CardTitle>
            <CardDescription>
              Acesso directo a ficheiro na rede (estilo Dolly)
            </CardDescription>
          </div>
          <Badge 
            variant={isClient ? 'secondary' : 'default'} 
            className="ml-auto"
          >
            {isClient ? 'CLIENTE' : 'SERVIDOR'}
          </Badge>
          <Button size="sm" variant="ghost" onClick={loadStatus} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* IP File Config */}
        <div className="p-4 bg-muted/30 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4" />
            <span className="font-medium text-sm">Ficheiro IP (Configuração)</span>
          </div>
          <code className="text-xs bg-background p-2 rounded block break-all font-mono">
            {ipFileContent || '(vazio - configure o caminho da base de dados)'}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Caminho: {ipFilePath}
          </p>
        </div>

        {/* Connection Status */}
        <div className={`p-4 rounded-lg border ${dbStatus?.connected ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="h-5 w-5" />
            <span className="font-medium">Estado da Ligação</span>
            {dbStatus?.connected ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 ml-auto" />
            )}
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Configurado:</span>
              <span>{dbStatus?.configured ? 'Sim' : 'Não'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ficheiro existe:</span>
              <span>{dbStatus?.exists ? 'Sim' : 'Não'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ligado:</span>
              <span>{dbStatus?.connected ? 'Sim' : 'Não'}</span>
            </div>
            {isClient && dbStatus?.serverIP && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servidor:</span>
                <span>{dbStatus.serverIP}</span>
              </div>
            )}
          </div>

          {dbStatus?.error && (
            <p className="text-xs text-red-500 mt-2">{dbStatus.error}</p>
          )}
        </div>

        {/* Mode explanation */}
        <div className={`p-4 rounded-lg border ${isClient ? 'bg-blue-500/10 border-blue-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
          {isClient ? (
            <>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Modo Cliente
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este computador acede à base de dados no servidor {dbStatus?.serverIP} via partilha de ficheiros Windows (UNC path).
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Modo Servidor
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este computador tem a base de dados local. Outros computadores podem aceder via partilha de ficheiros Windows.
              </p>
            </>
          )}
        </div>

        {/* Technical Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Informações técnicas
          </summary>
          <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2">
            <div>
              <span className="text-muted-foreground">Caminho da base de dados:</span>
              <code className="block mt-1 bg-background p-1 rounded break-all font-mono text-xs">
                {dbStatus?.path || 'Não configurado'}
              </code>
            </div>
            <div>
              <span className="text-muted-foreground">IPs locais deste computador:</span>
              <code className="block mt-1 bg-background p-1 rounded font-mono text-xs">
                {localIPs.join(', ') || 'N/A'}
              </code>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground">
                <strong>Formato do ficheiro IP:</strong>
              </p>
              <p className="mt-1">
                Servidor: <code className="bg-background px-1 rounded">C:\PayrollAO\payroll.db</code>
              </p>
              <p className="mt-1">
                Cliente: <code className="bg-background px-1 rounded">10.0.0.10:C:\PayrollAO\payroll.db</code>
              </p>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
