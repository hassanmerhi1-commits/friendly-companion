import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Database, FolderOpen, RefreshCw, Check, X, Copy, Link, Unlink } from "lucide-react";
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

interface DatabaseMode {
  isClientMode: boolean;
  dbPath: string;
  localDbPath: string;
  isConnectedToRemote: boolean;
}

export function NetworkSettings() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'standalone' | 'client'>('standalone');
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [databaseMode, setDatabaseMode] = useState<DatabaseMode | null>(null);
  const [localDataPath, setLocalDataPath] = useState<string>('');
  const [configFilePath, setConfigFilePath] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      
      // Determine mode based on actual database connection
      if (dbMode.isClientMode) {
        setMode('client');
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

  const connectToDatabase = async () => {
    if (!isElectron()) return;
    
    const path = connectPath.trim();
    
    if (!path) {
      toast.error("Preencha o caminho da base de dados");
      return;
    }
    
    setIsConnecting(true);
    try {
      const api = (window as any).electronAPI;
      
      // Normalize path separators
      let configContent = path.replace(/\//g, '\\');
      
      // Write config
      await api.network.writeServerConfigFile('', configContent);
      
      toast.success("Configuração guardada! A reiniciar...");
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Erro ao guardar configuração");
    }
    setIsConnecting(false);
  };

  const disconnectFromDatabase = async () => {
    if (!isElectron()) return;
    
    try {
      const api = (window as any).electronAPI;
      
      // Delete server-config.txt
      await api.network.deleteServerConfigFile();
      
      toast.success("Desligado! A reiniciar...");
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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
            <Database className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Base de Dados / Database</CardTitle>
            <CardDescription>
              {mode === 'client' ? 'Ligado a base de dados remota' : 'Base de dados local'}
            </CardDescription>
          </div>
          <Badge 
            variant={mode === 'client' ? 'default' : 'outline'} 
            className="ml-auto"
          >
            {mode === 'client' ? 'REMOTA' : 'LOCAL'}
          </Badge>
          <Button size="sm" variant="ghost" onClick={loadNetworkState} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Current Database Info */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Base de Dados Actual</span>
          </div>
          <code className="text-xs bg-background p-2 rounded block break-all">
            {databaseMode?.dbPath || localDataPath + '\\payroll.db'}
          </code>
          {mode === 'standalone' && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 Para partilhar com outros computadores, partilhe a pasta <code className="bg-background px-1 rounded">{localDataPath}</code> na rede Windows.
            </p>
          )}
        </div>

        {/* Client Mode - Connected */}
        {mode === 'client' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${databaseMode?.isConnectedToRemote ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
              <div className="flex items-center gap-2 mb-3">
                {databaseMode?.isConnectedToRemote ? (
                  <>
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">Ligado / Connected</span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-destructive" />
                    <span className="font-medium text-destructive">Sem Ligação / Not Connected</span>
                  </>
                )}
              </div>
              
              {!databaseMode?.isConnectedToRemote && (
                <p className="text-xs text-destructive/80 mb-2">
                  A base de dados remota não está acessível. Verifique se a pasta está partilhada e acessível.
                </p>
              )}
            </div>

            <Button variant="destructive" onClick={disconnectFromDatabase} className="w-full">
              <Unlink className="h-4 w-4 mr-2" />
              Desligar / Disconnect
            </Button>
          </div>
        )}

        {/* Standalone Mode - Connect Option */}
        {mode === 'standalone' && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Ligar a Base de Dados Remota</span>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="dbPath" className="text-xs">Caminho da Base de Dados (UNC ou IP:Caminho)</Label>
                <Input 
                  id="dbPath"
                  placeholder="\\SERVIDOR\PayrollAO\data\payroll.db"
                  value={connectPath}
                  onChange={(e) => setConnectPath(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Exemplos: <code>\\SERVIDOR\Partilha\data\payroll.db</code> ou <code>192.168.1.100:C:\PayrollAO\data</code>
                </p>
              </div>
              
              <Button 
                onClick={connectToDatabase} 
                className="w-full" 
                variant="secondary"
                disabled={isConnecting || !connectPath.trim()}
              >
                <Link className="h-4 w-4 mr-2" />
                {isConnecting ? 'A ligar...' : 'Ligar / Connect'}
              </Button>
            </div>
          </div>
        )}

        {/* Config File Info */}
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
              <span className="text-muted-foreground">Pasta de dados local:</span>
              <code className="block mt-1 bg-background p-1 rounded break-all">{localDataPath}</code>
            </div>
            {serverConfig?.exists && (
              <div>
                <span className="text-muted-foreground">Conteúdo do config:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-background p-1 rounded break-all flex-1">
                    {serverConfig.serverIP ? `${serverConfig.serverIP}:${serverConfig.serverPath}` : serverConfig.serverPath}
                  </code>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => copyToClipboard(serverConfig.serverIP ? `${serverConfig.serverIP}:${serverConfig.serverPath}` : serverConfig.serverPath)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
