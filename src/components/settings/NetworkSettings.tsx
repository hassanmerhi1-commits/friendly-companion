import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Server, RefreshCw, Copy, Power, PowerOff, Monitor } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
};

interface ServerStatus {
  running: boolean;
  port: number;
  addresses: string[];
}

interface IPFileInfo {
  content: string;
  isClient: boolean;
  serverIP: string | null;
  dbPath: string;
}

export function NetworkSettings() {
  const { t } = useLanguage();
  const [ipInfo, setIpInfo] = useState<IPFileInfo | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [localIPs, setLocalIPs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ipFilePath, setIpFilePath] = useState<string>('');

  // Load initial state
  useEffect(() => {
    if (!isElectron()) return;
    loadNetworkState();
  }, []);

  const loadNetworkState = async () => {
    if (!isElectron()) return;

    setIsRefreshing(true);
    try {
      const api = (window as any).electronAPI;

      // Get IP file info (Dolly style)
      const ipFile = await api.ipfile.read();
      const parsed = await api.ipfile.parse();
      setIpInfo({
        content: ipFile?.content || '',
        isClient: parsed?.isClient || false,
        serverIP: parsed?.serverIP || null,
        dbPath: parsed?.dbPath || '',
      });

      // Get server status
      const status = await api.network.getServerStatus();
      setServerStatus(status);

      // Get local IPs
      const ips = await api.network.getLocalIPs();
      setLocalIPs(ips);

      // Get IP file path
      const path = await api.network.getIPFilePath();
      setIpFilePath(path);
    } catch (error) {
      console.error('Error loading network state:', error);
    }
    setIsRefreshing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado! / Copied!");
  };

  // Start HTTP server for clients
  const startServer = async () => {
    if (!isElectron()) return;
    
    try {
      const api = (window as any).electronAPI;
      const result = await api.network.startServer(3847);
      
      if (result.success) {
        toast.success(`Servidor iniciado na porta ${result.port}`);
        await loadNetworkState();
      } else {
        toast.error(result.error || "Erro ao iniciar servidor");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao iniciar servidor");
    }
  };

  const stopServer = async () => {
    if (!isElectron()) return;
    
    try {
      const api = (window as any).electronAPI;
      await api.network.stopServer();
      toast.success("Servidor parado");
      await loadNetworkState();
    } catch (error: any) {
      toast.error(error.message || "Erro ao parar servidor");
    }
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
              <CardTitle>Rede / Network</CardTitle>
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

  const isClient = ipInfo?.isClient || false;
  const isServer = serverStatus?.running || false;

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
              Partilhar dados com outros computadores na mesma rede
            </CardDescription>
          </div>
          <Badge 
            variant={isServer ? 'default' : isClient ? 'secondary' : 'outline'} 
            className="ml-auto"
          >
            {isServer ? 'SERVIDOR' : isClient ? 'CLIENTE' : 'INDEPENDENTE'}
          </Badge>
          <Button size="sm" variant="ghost" onClick={loadNetworkState} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* IP File Info (Dolly Style) */}
        <div className="p-4 bg-muted/30 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4" />
            <span className="font-medium text-sm">Ficheiro IP</span>
          </div>
          <code className="text-xs bg-background p-2 rounded block break-all">
            {ipInfo?.content || '(vazio)'}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Caminho: {ipFilePath}
          </p>
          {isClient && (
            <p className="text-xs text-blue-500 mt-1">
              → Modo cliente: a ligar ao servidor {ipInfo?.serverIP}
            </p>
          )}
        </div>

        {/* ========== SERVER MODE ========== */}
        {!isClient && (
          <div className="space-y-4">
            {isServer ? (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="h-5 w-5 text-blue-500" />
                  <span className="font-medium text-blue-700 dark:text-blue-400">
                    Servidor HTTP Activo
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Endereço(s) para clientes:
                    </p>
                    {localIPs.map((ip, index) => (
                      <div key={index} className="flex items-center gap-2 mt-1">
                        <code className="bg-background p-2 rounded text-sm flex-1">
                          {ip}:{serverStatus?.port || 3847}
                        </code>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(`${ip}:${serverStatus?.port || 3847}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button variant="destructive" onClick={stopServer} className="w-full mt-4">
                  <PowerOff className="h-4 w-4 mr-2" />
                  Parar Servidor
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Iniciar Servidor HTTP</span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Inicie o servidor para que clientes possam aceder via HTTP (opcional).
                </p>
                
                <Button onClick={startServer} className="w-full" variant="default">
                  <Power className="h-4 w-4 mr-2" />
                  Iniciar Servidor
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Client Mode Info */}
        {isClient && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm">
              Este computador está configurado como <strong>cliente</strong>.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Para mudar, edite o ficheiro IP acima removendo o IP do servidor.
            </p>
          </div>
        )}

        {/* Technical Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Informações técnicas
          </summary>
          <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2">
            <div>
              <span className="text-muted-foreground">Base de dados:</span>
              <code className="block mt-1 bg-background p-1 rounded break-all">{ipInfo?.dbPath || '?'}</code>
            </div>
            <div>
              <span className="text-muted-foreground">IPs locais:</span>
              <code className="block mt-1 bg-background p-1 rounded">{localIPs.join(', ') || 'N/A'}</code>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
