import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Server, Wifi, RefreshCw, Check, X, Copy, Power, PowerOff, Monitor } from "lucide-react";
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

export function NetworkSettings() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'server' | 'client' | 'standalone'>('standalone');
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [localIPs, setLocalIPs] = useState<string[]>([]);
  const [configFilePath, setConfigFilePath] = useState<string>('');
  const [localDataPath, setLocalDataPath] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Client mode connection
  const [serverIP, setServerIP] = useState<string>('');
  const [serverPort, setServerPort] = useState<string>('3847');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionTest, setConnectionTest] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

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

      // Get server status
      const status = await api.network.getServerStatus();
      setServerStatus(status);

      // Get local IPs
      const ips = await api.network.getLocalIPs();
      setLocalIPs(ips);

      // Get config file path
      const cfgPath = await api.network.getServerConfigFilePath();
      setConfigFilePath(cfgPath);

      // Get local data path
      const dataPath = await api.network.getLocalDataPath();
      setLocalDataPath(dataPath);

      // Get server-config.txt content to see if we're in client mode
      const config = await api.network.readServerConfigFile();
      
      if (config?.exists && config.serverIP && config.serverPort) {
        // We have a server config - we're a client
        setMode('client');
        setServerIP(config.serverIP);
        setServerPort(String(config.serverPort));
      } else if (status?.running) {
        // Server is running - we're the server
        setMode('server');
      } else {
        setMode('standalone');
      }
    } catch (error) {
      console.error('Error loading network state:', error);
    }
    setIsRefreshing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado! / Copied!");
  };

  // ========== SERVER MODE ==========
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

  // ========== CLIENT MODE ==========
  const testConnection = async () => {
    if (!serverIP.trim()) {
      toast.error("Introduza o IP do servidor");
      return;
    }

    setConnectionTest('testing');
    try {
      const api = (window as any).electronAPI;
      const port = parseInt(serverPort) || 3847;
      const result = await api.network.pingServer(serverIP.trim(), port);
      
      if (result.success) {
        setConnectionTest('success');
        toast.success("Ligação bem sucedida!");
      } else {
        setConnectionTest('failed');
        toast.error(result.error || "Não foi possível ligar ao servidor");
      }
    } catch (error: any) {
      setConnectionTest('failed');
      toast.error(error.message || "Erro de ligação");
    }
  };

  const connectToServer = async () => {
    if (!serverIP.trim()) {
      toast.error("Introduza o IP do servidor");
      return;
    }

    setIsConnecting(true);
    try {
      const api = (window as any).electronAPI;
      const port = parseInt(serverPort) || 3847;
      
      // Test connection first
      const pingResult = await api.network.pingServer(serverIP.trim(), port);
      if (!pingResult.success) {
        toast.error("Não foi possível ligar ao servidor. Verifique se está a correr.");
        setIsConnecting(false);
        return;
      }

      // Save config as IP:PORT format
      const configContent = `${serverIP.trim()}:${port}`;
      await api.network.writeServerConfigFile(serverIP.trim(), String(port));

      toast.success("Configuração guardada! A reiniciar...");

      setTimeout(() => {
        if (api.app?.relaunch) {
          api.app.relaunch();
        } else {
          window.location.reload();
        }
      }, 800);
    } catch (error: any) {
      toast.error(error.message || "Erro ao guardar configuração");
    }
    setIsConnecting(false);
  };

  const disconnectFromServer = async () => {
    if (!isElectron()) return;

    try {
      const api = (window as any).electronAPI;
      await api.network.deleteServerConfigFile();

      toast.success("Desligado! A reiniciar...");

      setTimeout(() => {
        if (api.app?.relaunch) {
          api.app.relaunch();
        } else {
          window.location.reload();
        }
      }, 800);
    } catch (error: any) {
      toast.error(error.message || "Erro ao desligar");
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
            <CardTitle>Rede LAN / LAN Network</CardTitle>
            <CardDescription>
              Partilhar dados com outros computadores na mesma rede
            </CardDescription>
          </div>
          <Badge 
            variant={mode === 'server' ? 'default' : mode === 'client' ? 'secondary' : 'outline'} 
            className="ml-auto"
          >
            {mode === 'server' ? 'SERVIDOR' : mode === 'client' ? 'CLIENTE' : 'INDEPENDENTE'}
          </Badge>
          <Button size="sm" variant="ghost" onClick={loadNetworkState} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* ========== CLIENT MODE (Connected) ========== */}
        {mode === 'client' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700 dark:text-green-400">
                  Ligado ao Servidor / Connected to Server
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>IP:</strong> {serverIP}</p>
                <p><strong>Porta:</strong> {serverPort}</p>
              </div>
            </div>

            <Button variant="destructive" onClick={disconnectFromServer} className="w-full">
              <PowerOff className="h-4 w-4 mr-2" />
              Desligar / Disconnect
            </Button>
          </div>
        )}

        {/* ========== SERVER MODE ========== */}
        {mode === 'server' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-blue-700 dark:text-blue-400">
                  Servidor Activo / Server Running
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Endereço(s) para clientes / Client addresses:
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
                
                <p className="text-xs text-muted-foreground">
                  💡 Nos computadores clientes, introduza um destes endereços para ligar.
                </p>
              </div>
            </div>

            <Button variant="destructive" onClick={stopServer} className="w-full">
              <PowerOff className="h-4 w-4 mr-2" />
              Parar Servidor / Stop Server
            </Button>
          </div>
        )}

        {/* ========== STANDALONE MODE ========== */}
        {mode === 'standalone' && (
          <div className="space-y-6">
            {/* Option 1: Be the Server */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Este PC é o Servidor (Dados Principais)</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Inicie o servidor para que outros computadores possam ligar-se a este PC e usar os mesmos dados.
              </p>
              
              <Button onClick={startServer} className="w-full" variant="default">
                <Power className="h-4 w-4 mr-2" />
                Iniciar Servidor / Start Server
              </Button>
            </div>

            {/* Option 2: Be a Client */}
            <div className="p-4 bg-secondary/30 border border-border rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Este PC é Cliente (Ligar a Servidor)</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Introduza o endereço do servidor para ligar a um PC principal.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="serverIP" className="text-xs">IP do Servidor</Label>
                  <Input 
                    id="serverIP"
                    placeholder="192.168.1.100"
                    value={serverIP}
                    onChange={(e) => setServerIP(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="serverPort" className="text-xs">Porta</Label>
                  <Input 
                    id="serverPort"
                    placeholder="3847"
                    value={serverPort}
                    onChange={(e) => setServerPort(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={testConnection}
                  disabled={connectionTest === 'testing'}
                  className="flex-1"
                >
                  {connectionTest === 'testing' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : connectionTest === 'success' ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : connectionTest === 'failed' ? (
                    <X className="h-4 w-4 mr-2 text-red-500" />
                  ) : (
                    <Wifi className="h-4 w-4 mr-2" />
                  )}
                  Testar / Test
                </Button>
                
                <Button 
                  onClick={connectToServer}
                  disabled={isConnecting || !serverIP.trim()}
                  className="flex-1"
                >
                  {isConnecting ? 'A ligar...' : 'Ligar / Connect'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Technical Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Informações técnicas / Technical info
          </summary>
          <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2">
            <div>
              <span className="text-muted-foreground">Ficheiro de config:</span>
              <code className="block mt-1 bg-background p-1 rounded break-all">{configFilePath}</code>
            </div>
            <div>
              <span className="text-muted-foreground">Base de dados local:</span>
              <code className="block mt-1 bg-background p-1 rounded break-all">{localDataPath}</code>
            </div>
            {mode === 'server' && (
              <div>
                <span className="text-muted-foreground">Estado do servidor:</span>
                <code className="block mt-1 bg-background p-1 rounded">
                  {serverStatus?.running ? `Activo na porta ${serverStatus.port}` : 'Parado'}
                </code>
              </div>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
