import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, RefreshCw, Monitor, HardDrive, CheckCircle2, XCircle, Server, Plug, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { liveGetStatus, DBStatus } from "@/lib/db-live";

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
};

export function NetworkSettings() {
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [localIPs, setLocalIPs] = useState<string[]>([]);
  const [computerName, setComputerName] = useState<string>('');
  const [ipFilePath, setIpFilePath] = useState<string>('');
  const [ipFileContent, setIpFileContent] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (!isElectron()) return;
    loadStatus();
  }, []);

  const loadStatus = async () => {
    if (!isElectron()) return;

    setIsRefreshing(true);
    try {
      const api = (window as any).electronAPI;

      let status = await api.db.getStatus();

      // If configured but not connected, try to init automatically
      if (status?.configured && !status?.connected) {
        await api.db.init();
        status = await api.db.getStatus();
      }

      setDbStatus(status);

      const ipFile = await api.ipfile.read();
      setIpFileContent(ipFile?.content || '');

      const ips = await api.network.getLocalIPs();
      setLocalIPs(ips);

      const path = await api.network.getIPFilePath();
      setIpFilePath(path);

      const name = await api.network.getComputerName();
      setComputerName(name);
    } catch (error) {
      console.error('Error loading status:', error);
    }
    setIsRefreshing(false);
  };

  const testConnection = async () => {
    if (!isElectron()) return;

    setIsTesting(true);
    try {
      const api = (window as any).electronAPI;
      const result = await api.db.testConnection();
      
      if (result.success) {
        toast.success('Conexão OK!');
      } else {
        toast.error(`Erro: ${result.error || 'Falha na conexão'}`);
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message || 'Falha na conexão'}`);
    }
    setIsTesting(false);
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

  const isServer = dbStatus?.isServer || false;
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
              WebSocket na porta 4545
            </CardDescription>
          </div>
          <Badge 
            variant={isServer ? 'default' : 'secondary'} 
            className="ml-auto"
          >
            {isServer ? 'SERVIDOR' : isClient ? 'CLIENTE' : 'NÃO CONFIGURADO'}
          </Badge>
          <Button size="sm" variant="ghost" onClick={loadStatus} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Computer Name */}
        {computerName && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Nome deste computador:</span>
              <code className="bg-background px-2 py-0.5 rounded text-sm font-mono font-bold">
                {computerName}
              </code>
            </div>
          </div>
        )}

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
            {isServer && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ficheiro existe:</span>
                <span>{dbStatus?.exists ? 'Sim' : 'Não'}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ligado:</span>
              <span>{dbStatus?.connected ? 'Sim' : 'Não'}</span>
            </div>
            {isClient && dbStatus?.serverAddress && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servidor:</span>
                <span className="font-mono">{dbStatus.serverAddress}</span>
              </div>
            )}
          </div>

          {dbStatus?.error && (
            <p className="text-xs text-red-500 mt-2">{dbStatus.error}</p>
          )}
        </div>

        {/* WebSocket Status */}
        <div className={`p-4 rounded-lg border ${
          isServer 
            ? (dbStatus?.wsServerRunning ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20')
            : (dbStatus?.wsClientConnected ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20')
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {(isServer ? dbStatus?.wsServerRunning : dbStatus?.wsClientConnected) 
              ? <Wifi className="h-5 w-5 text-green-600" /> 
              : <WifiOff className="h-5 w-5 text-orange-500" />
            }
            <span className="font-medium">Sincronização em Tempo Real</span>
            {(isServer ? dbStatus?.wsServerRunning : dbStatus?.wsClientConnected) ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-500 ml-auto" />
            )}
          </div>
          
          <div className="space-y-2 text-sm">
            {isServer && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WebSocket Server:</span>
                  <span className={dbStatus?.wsServerRunning ? 'text-green-600' : 'text-red-500'}>
                    {dbStatus?.wsServerRunning ? `Porta ${dbStatus?.wsPort || 4545}` : 'Inactivo'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clientes conectados:</span>
                  <span className="text-blue-600 font-medium">{dbStatus?.wsClients || 0}</span>
                </div>
              </>
            )}
            {isClient && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">WebSocket:</span>
                <span className={dbStatus?.wsClientConnected ? 'text-green-600' : 'text-orange-500'}>
                  {dbStatus?.wsClientConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            )}
          </div>
          
          {isClient && !dbStatus?.wsClientConnected && (
            <div className="mt-3 p-2 bg-orange-500/10 rounded text-xs text-orange-600 dark:text-orange-400">
              <p className="font-medium mb-1">⚠️ Sincronização offline</p>
              <p>Verifique:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Firewall do Windows na porta <strong>4545</strong></li>
                <li>Ambos PCs na mesma rede</li>
                <li>Servidor está a correr</li>
              </ul>
            </div>
          )}
        </div>

        {/* Test Connection Button */}
        <Button 
          onClick={testConnection} 
          disabled={isTesting || !dbStatus?.configured}
          className="w-full"
          variant="outline"
        >
          <Plug className={`h-4 w-4 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
          {isTesting ? 'Testando...' : 'Testar Conexão'}
        </Button>

        {/* Mode explanation */}
        <div className={`p-4 rounded-lg border ${isServer ? 'bg-green-500/10 border-green-500/20' : isClient ? 'bg-blue-500/10 border-blue-500/20' : 'bg-muted/30 border-border'}`}>
          {isServer ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Modo Servidor
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Base de dados local com servidor WebSocket activo na porta 4545.
                Os clientes conectam-se usando: <strong>{computerName}</strong> ou IPs: <strong>{localIPs.join(', ')}</strong>
              </p>
            </>
          ) : isClient ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Plug className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Modo Cliente
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Conecta ao servidor <strong>{dbStatus?.serverAddress}</strong> via WebSocket.
                Requer porta 4545 aberta no firewall do servidor.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Não Configurado
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure o ficheiro IP em C:\PayrollAO\IP
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
                {dbStatus?.path || 'Não configurado (modo cliente)'}
              </code>
            </div>
            <div>
              <span className="text-muted-foreground">Nome do computador:</span>
              <code className="ml-2 bg-background px-1 rounded font-mono text-xs">
                {computerName}
              </code>
            </div>
            <div>
              <span className="text-muted-foreground">IPs locais:</span>
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
                Cliente: <code className="bg-background px-1 rounded">NOME_DO_SERVIDOR</code> ou <code className="bg-background px-1 rounded">10.0.0.10</code>
              </p>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground">
                <strong>Arquitectura:</strong> WebSocket (porta 4545).
                Requer regra de firewall no servidor.
              </p>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
