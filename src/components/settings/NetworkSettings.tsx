import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Server, Monitor, FolderOpen, RefreshCw, Check, X, Copy, Database, Link, Unlink } from "lucide-react";
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

interface DatabaseMode {
  isClientMode: boolean;
  dbPath: string;
  localDbPath: string;
  isConnectedToRemote: boolean;
}

export function NetworkSettings() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'standalone' | 'server' | 'client'>('standalone');
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [databaseMode, setDatabaseMode] = useState<DatabaseMode | null>(null);
  const [localDataPath, setLocalDataPath] = useState<string>('');
  const [configFilePath, setConfigFilePath] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectIP, setConnectIP] = useState<string>('');
  const [connectPath, setConnectPath] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

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
      
      // Get database mode (this tells us if we're actually connected to remote DB)
      const dbMode = await api.network.getDatabaseMode();
      setDatabaseMode(dbMode);
      
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
      
      // Determine mode based on actual database connection
      if (dbMode.isClientMode) {
        // Using remote database - this is a client
        setMode('client');
      } else if (status.running) {
        // Server is running - this is the server
        setMode('server');
      } else if (config.exists && config.serverPath) {
        // Has config but not connected - client that couldn't connect
        setMode('client');
      } else {
        setMode('standalone');
      }
    } catch (error) {
      console.error('Error loading network state:', error);
    }
    setIsRefreshing(false);
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
          const dataPath = await api.network.getLocalDataPath();
          setLocalDataPath(dataPath);
          await api.network.writeServerConfigFile(ip, dataPath);
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

  const connectToServer = async () => {
    if (!isElectron()) return;
    if (!connectIP.trim() || !connectPath.trim()) {
      toast.error("Preencha o IP e o caminho do servidor");
      return;
    }
    
    setIsConnecting(true);
    try {
      const api = (window as any).electronAPI;
      
      // Write the server-config.txt with the entered IP:Path
      await api.network.writeServerConfigFile(connectIP.trim(), connectPath.trim());
      
      toast.success("Configuração guardada! Reinicie a aplicação para ligar.");
      toast.info("A reiniciar aplicação...", { duration: 2000 });
      
      // Reload the app to apply the new config
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao guardar configuração");
    }
    setIsConnecting(false);
  };

  const disconnectFromServer = async () => {
    if (!isElectron()) return;
    
    try {
      const api = (window as any).electronAPI;
      
      // Delete server-config.txt
      await api.network.deleteServerConfigFile();
      
      toast.success("Desligado do servidor! Reinicie a aplicação.");
      toast.info("A reiniciar aplicação...", { duration: 2000 });
      
      // Reload the app to apply the change
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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
                Este computador está a funcionar de forma autónoma com base de dados local.
              </p>
              <Button onClick={startServer} className="w-full">
                <Server className="h-4 w-4 mr-2" />
                Tornar-se Servidor / Become Server
              </Button>
            </div>
            
            {/* Connect to Server Section */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Ligar a um Servidor / Connect to Server</span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="serverIP" className="text-xs">IP do Servidor / Server IP</Label>
                  <Input 
                    id="serverIP"
                    placeholder="Ex: 192.168.1.100"
                    value={connectIP}
                    onChange={(e) => setConnectIP(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="serverPath" className="text-xs">Caminho da Pasta Partilhada / Shared Folder Path</Label>
                  <Input 
                    id="serverPath"
                    placeholder="Ex: C:\PayrollAO\data"
                    value={connectPath}
                    onChange={(e) => setConnectPath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    O caminho exacto da pasta de dados no servidor
                  </p>
                </div>
                
                <Button 
                  onClick={connectToServer} 
                  className="w-full" 
                  variant="secondary"
                  disabled={isConnecting || !connectIP.trim() || !connectPath.trim()}
                >
                  <Link className="h-4 w-4 mr-2" />
                  {isConnecting ? 'A ligar...' : 'Ligar ao Servidor / Connect'}
                </Button>
              </div>
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
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="ml-2"
                    onClick={() => copyToClipboard(`${serverConfig.serverIP}:${serverConfig.serverPath || localDataPath}`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p><strong>⚠️ Importante:</strong> A pasta de dados deve estar partilhada na rede.</p>
              <p>Caminho: <code className="bg-background px-1 rounded">{localDataPath}</code></p>
            </div>

            <Button variant="destructive" onClick={stopServer} className="w-full">
              Parar Servidor / Stop Server
            </Button>
          </div>
        )}

        {/* Client Mode */}
        {mode === 'client' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${databaseMode?.isConnectedToRemote ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
              <div className="flex items-center gap-2 mb-3">
                {databaseMode?.isConnectedToRemote ? (
                  <>
                    <Database className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">Ligado à Base de Dados Remota</span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-destructive" />
                    <span className="font-medium text-destructive">Sem Ligação à Base de Dados</span>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={loadNetworkState} disabled={isRefreshing} className="ml-auto">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Servidor / Server:</span>
                  <span className="font-mono">{serverConfig?.serverIP}</span>
                </div>
                {serverConfig?.serverPath && (
                  <div>
                    <span className="text-muted-foreground">Caminho / Path:</span>
                    <code className="text-xs block mt-1 bg-background p-1 rounded break-all">{serverConfig?.serverPath}</code>
                  </div>
                )}
                {databaseMode && (
                  <div>
                    <span className="text-muted-foreground">Base de Dados Actual:</span>
                    <code className="text-xs block mt-1 bg-background p-1 rounded break-all">{databaseMode.dbPath}</code>
                  </div>
                )}
              </div>
            </div>

            {!databaseMode?.isConnectedToRemote && (
              <div className="text-xs text-destructive/80 p-3 bg-destructive/10 rounded-lg space-y-2">
                <p><strong>Não foi possível aceder à base de dados remota.</strong></p>
                <p>Verifique que:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>O servidor está ligado</li>
                  <li>A pasta está partilhada na rede (Share)</li>
                  <li>Tem permissões de acesso à pasta</li>
                  <li>O IP e caminho estão correctos</li>
                </ul>
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={disconnectFromServer} 
              className="w-full"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Desligar do Servidor / Disconnect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
