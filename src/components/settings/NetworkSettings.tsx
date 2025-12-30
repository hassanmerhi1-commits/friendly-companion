import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Server, Monitor, FolderOpen, RefreshCw, Check, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
};

interface ServerConfig {
  exists: boolean;
  serverIP: string;
  serverPort: number;
  serverPath: string;
}

interface ServerStatus {
  running: boolean;
  port: number;
  addresses: { name: string; address: string }[];
}

export function NetworkSettings() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'standalone' | 'server' | 'client'>('standalone');
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [localDataPath, setLocalDataPath] = useState<string>('');
  const [configFilePath, setConfigFilePath] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load initial state
  useEffect(() => {
    if (!isElectron()) return;

    const loadNetworkState = async () => {
      try {
        const api = (window as any).electronAPI;
        
        // Get server-config.txt content
        const config = await api.network.readServerConfigFile();
        setServerConfig(config);
        
        // Get local data path
        const dataPath = await api.network.getLocalDataPath();
        setLocalDataPath(dataPath);
        
        // Get config file path
        const cfgPath = await api.network.getServerConfigFilePath();
        setConfigFilePath(cfgPath);
        
        // Get server status
        const status = await api.network.getServerStatus();
        setServerStatus(status);
        
        // Determine mode based on config and server status
        if (config.exists && config.serverIP) {
          // Has a server-config.txt with server IP - this is a client
          setMode('client');
          // Test connection
          testConnection(config.serverIP, config.serverPort);
        } else if (status.running) {
          // Server is running - this is the server
          setMode('server');
        } else {
          setMode('standalone');
        }
      } catch (error) {
        console.error('Error loading network state:', error);
      }
    };

    loadNetworkState();
  }, []);

  const testConnection = async (ip: string, port: number) => {
    if (!isElectron()) return;
    
    setIsTesting(true);
    try {
      const api = (window as any).electronAPI;
      const result = await api.network.pingServer(ip, port);
      setIsConnected(result?.success === true);
    } catch {
      setIsConnected(false);
    }
    setIsTesting(false);
  };

  const startServer = async () => {
    if (!isElectron()) return;
    
    try {
      const api = (window as any).electronAPI;
      const result = await api.network.startServer(3847);
      
      if (result?.success) {
        toast.success("Servidor iniciado / Server started");
        
        // Update network config to remember server mode
        await api.network.setConfig({ mode: 'server', serverPort: 3847 });
        
        // Refresh status
        const status = await api.network.getServerStatus();
        setServerStatus(status);
        setMode('server');
        
        // Create server-config.txt with first available IP and data path
        if (status.addresses?.length > 0) {
          const ip = status.addresses[0].address;
          await api.network.writeServerConfigFile(ip, localDataPath);
          const config = await api.network.readServerConfigFile();
          setServerConfig(config);
        }
      } else {
        toast.error(result?.error || "Erro ao iniciar servidor");
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
      
      // Update network config
      await api.network.setConfig({ mode: 'standalone', serverPort: 3847 });
      
      // Delete server-config.txt
      await api.network.deleteServerConfigFile();
      
      setServerStatus({ running: false, port: 3847, addresses: [] });
      setMode('standalone');
      setServerConfig({ exists: false, serverIP: '', serverPort: 3847, serverPath: '' });
      
      toast.success("Servidor parado / Server stopped");
    } catch (error: any) {
      toast.error(error.message || "Erro ao parar servidor");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado! / Copied!");
  };

  const refreshConnection = () => {
    if (serverConfig?.serverIP) {
      testConnection(serverConfig.serverIP, serverConfig.serverPort);
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

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Rede / Network</CardTitle>
            <CardDescription>
              Modo de ligação: {mode === 'server' ? 'Servidor' : mode === 'client' ? 'Cliente' : 'Autónomo'}
            </CardDescription>
          </div>
          <Badge variant={mode === 'server' ? 'default' : mode === 'client' ? 'secondary' : 'outline'} className="ml-auto">
            {mode === 'server' && <Server className="h-3 w-3 mr-1" />}
            {mode === 'client' && <Monitor className="h-3 w-3 mr-1" />}
            {mode === 'server' ? 'SERVIDOR' : mode === 'client' ? 'CLIENTE' : 'AUTÓNOMO'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Standalone Mode */}
        {mode === 'standalone' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-4">
                Este computador está a funcionar de forma autónoma. Para partilhar dados com outros computadores:
              </p>
              <Button onClick={startServer} className="w-full">
                <Server className="h-4 w-4 mr-2" />
                Tornar-se Servidor / Become Server
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p><strong>Para ligar como cliente:</strong> Copie o ficheiro <code>server-config.txt</code> do servidor para a sua pasta <code>data</code>.</p>
              <p className="mt-1">Caminho: <code>{configFilePath}</code></p>
            </div>
          </div>
        )}

        {/* Server Mode */}
        {mode === 'server' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700 dark:text-green-400">Servidor Activo / Server Active</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Porta / Port:</span>
                  <span className="font-mono">{serverStatus?.port || 3847}</span>
                </div>
                
                {serverStatus?.addresses?.map((addr, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{addr.name}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{addr.address}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(addr.address)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Ficheiro de Configuração / Config File</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Copie este ficheiro para os computadores cliente:
              </p>
              <code className="text-xs bg-background p-2 rounded block break-all">{configFilePath}</code>
              
              {serverConfig?.exists && (
                <div className="mt-3 p-2 bg-background rounded">
                  <p className="text-xs text-muted-foreground mb-1">Conteúdo / Content:</p>
                  <code className="text-sm font-mono">
                    {serverConfig.serverIP}:{serverConfig.serverPath || localDataPath}
                  </code>
                </div>
              )}
            </div>

            <Button variant="destructive" onClick={stopServer} className="w-full">
              Parar Servidor / Stop Server
            </Button>
          </div>
        )}

        {/* Client Mode */}
        {mode === 'client' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${isConnected ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
              <div className="flex items-center gap-2 mb-3">
                {isConnected ? (
                  <>
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">Ligado ao Servidor / Connected to Server</span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-destructive" />
                    <span className="font-medium text-destructive">Sem Ligação / Not Connected</span>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={refreshConnection} disabled={isTesting} className="ml-auto">
                  <RefreshCw className={`h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Servidor / Server:</span>
                  <span className="font-mono">{serverConfig?.serverIP}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Porta / Port:</span>
                  <span className="font-mono">{serverConfig?.serverPort}</span>
                </div>
                {serverConfig?.serverPath && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Caminho / Path:</span>
                    <span className="font-mono text-xs">{serverConfig?.serverPath}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
              <p><strong>Configuração lida de:</strong></p>
              <code className="break-all">{configFilePath}</code>
              <p className="mt-2">Para desligar do servidor, elimine este ficheiro e reinicie a aplicação.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}