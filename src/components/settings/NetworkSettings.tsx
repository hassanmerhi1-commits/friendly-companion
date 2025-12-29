import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNetworkStore, NetworkMode } from '@/stores/network-store';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { 
  Wifi, 
  WifiOff, 
  Server, 
  Monitor, 
  RefreshCw, 
  Check, 
  X,
  Copy,
  Globe,
  Download,
  Upload,
  Clock,
  FileText,
  FolderOpen
} from 'lucide-react';

export const NetworkSettings = () => {
  const { t } = useLanguage();
  const { 
    config, 
    serverStatus, 
    isConnected,
    lastSyncTime,
    isSyncing,
    serverConfigFile,
    serverConfigFilePath,
    setConfig, 
    startServer, 
    stopServer, 
    pullFromServer,
    pushToServer,
    testConnection,
    getLocalIPs,
    refreshServerStatus,
    setAutoSyncEnabled,
    setAutoSyncInterval,
    writeServerConfigFile,
    deleteServerConfigFile,
    getServerConfigFilePath,
    applyServerConfigFile,
    readServerConfigFile
  } = useNetworkStore();

  const [localIPs, setLocalIPs] = useState<{ name: string; address: string }[]>([]);
  const [serverIP, setServerIP] = useState(config.serverIP ?? "");
  const [serverPort, setServerPort] = useState(String(config.serverPort ?? 3847));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const isElectron = typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;

  useEffect(() => {
    if (isElectron) {
      refreshServerStatus();
      getLocalIPs().then(setLocalIPs);
      getServerConfigFilePath();
      readServerConfigFile();
    }
  }, []);

  useEffect(() => {
    setServerIP(config.serverIP ?? "");
    setServerPort(String(config.serverPort ?? 3847));
  }, [config]);

  const handleModeChange = async (mode: NetworkMode) => {
    if (mode === 'server') {
      const result = await startServer(parseInt(serverPort) || 3847);
      if (result.success) {
        toast.success(t.network?.serverStarted || 'Servidor iniciado com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao iniciar servidor');
      }
    } else if (mode === 'standalone') {
      await stopServer();
      await setConfig({ mode: 'standalone', serverIP: '' });
      toast.success(t.network?.modeChanged || 'Modo alterado para local');
    } else if (mode === 'client') {
      await setConfig({ mode: 'client' });
    }
  };

  const handleTestConnection = async () => {
    if (!serverIP) {
      toast.error(t.network?.enterIP || 'Introduza o endereço IP do servidor');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testConnection(serverIP, parseInt(serverPort) || 3847);
    
    setIsTesting(false);
    setTestResult(result.success ? 'success' : 'error');

    if (result.success) {
      toast.success(t.network?.connectionSuccess || 'Conexão bem sucedida!');
    } else {
      toast.error(result.error || t.network?.connectionFailed || 'Falha na conexão');
    }
  };

  const handleSaveClientConfig = async () => {
    // Allow inputs like "http://192.168.1.10:3847" or "192.168.1.10:3847"
    let ip = serverIP.trim();
    let port = parseInt(serverPort) || 3847;

    ip = ip.replace(/^https?:\/\//, '').trim();

    if (ip.includes('/')) {
      ip = ip.split('/')[0];
    }

    if (ip.includes(':')) {
      const [maybeIp, maybePort] = ip.split(':');
      ip = (maybeIp || '').trim();
      const p = parseInt((maybePort || '').trim());
      if (!Number.isNaN(p)) port = p;
    }

    await setConfig({
      mode: 'client',
      serverIP: ip,
      serverPort: port,
    });

    setServerIP(ip);
    setServerPort(String(port));
    toast.success(t.network?.configSaved || 'Configuração guardada');
  };

  const handlePull = async () => {
    const result = await pullFromServer();
    if (result.success) {
      toast.success('Dados baixados do servidor! A recarregar...');
    } else {
      toast.error(result.error || 'Falha ao baixar dados');
    }
  };

  const handlePush = async () => {
    const result = await pushToServer();
    if (result.success) {
      toast.success('Dados enviados para o servidor com sucesso!');
    } else {
      toast.error(result.error || 'Falha ao enviar dados');
    }
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    await setAutoSyncEnabled(enabled);
    if (enabled) {
      toast.success('Sincronização automática ativada');
    } else {
      toast.success('Sincronização automática desativada');
    }
  };

  const handleIntervalChange = async (value: string) => {
    const seconds = parseInt(value);
    await setAutoSyncInterval(seconds);
    toast.success(`Intervalo alterado para ${seconds} segundos`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t.network?.copied || 'Copiado!');
  };

  const handleCreateServerConfigFile = async () => {
    if (localIPs.length === 0) {
      toast.error('Nenhum endereço IP disponível');
      return;
    }
    
    // Use the first non-internal IP
    const ip = localIPs[0].address;
    const port = serverStatus?.port || 3847;
    
    const result = await writeServerConfigFile(ip, port);
    if (result.success) {
      toast.success(`Ficheiro server-config.txt criado: ${ip}:${port}`);
      await readServerConfigFile();
    } else {
      toast.error(result.error || 'Erro ao criar ficheiro');
    }
  };

  const handleDeleteServerConfigFile = async () => {
    const result = await deleteServerConfigFile();
    if (result.success) {
      toast.success('Ficheiro server-config.txt eliminado');
    } else {
      toast.error(result.error || 'Erro ao eliminar ficheiro');
    }
  };

  const handleApplyServerConfigFile = async () => {
    const result = await applyServerConfigFile();
    if (result.success) {
      toast.success('Configuração aplicada do ficheiro server-config.txt');
    } else {
      toast.error(result.error || 'Erro ao aplicar configuração');
    }
  };

  if (!isElectron) {
    return (
      <div className="stat-card animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <WifiOff className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">
              {t.network?.title || 'Rede Local'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.network?.desktopOnly || 'Funcionalidade disponível apenas na versão desktop'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card animate-slide-up border-2 border-primary/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Globe className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-foreground">
            {t.network?.title || 'Rede Local (LAN)'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.network?.subtitle || 'Partilhar dados com outros computadores na rede'}
          </p>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-4 mb-6">
        <Label className="text-base font-medium">
          {t.network?.mode || 'Modo de Funcionamento'}
        </Label>
        
        {/* Standalone Mode */}
        <div 
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            config.mode === 'standalone' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => handleModeChange('standalone')}
        >
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{t.network?.standalone || 'Local (Offline)'}</p>
              <p className="text-sm text-muted-foreground">
                {t.network?.standaloneDesc || 'Apenas este computador, sem rede'}
              </p>
            </div>
            {config.mode === 'standalone' && (
              <Badge variant="default">{t.common?.active || 'Ativo'}</Badge>
            )}
          </div>
        </div>

        {/* Server Mode */}
        <div 
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            config.mode === 'server' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => handleModeChange('server')}
        >
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{t.network?.server || 'Servidor'}</p>
              <p className="text-sm text-muted-foreground">
                {t.network?.serverDesc || 'Este computador guarda os dados e outros conectam aqui'}
              </p>
            </div>
            {config.mode === 'server' && (
              <Badge variant="default" className="bg-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                {t.network?.running || 'A correr'}
              </Badge>
            )}
          </div>

          {/* Server Status */}
          {config.mode === 'server' && serverStatus?.running && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-3">
              <p className="text-sm font-medium">{t.network?.serverAddresses || 'Endereços do Servidor:'}</p>
              {localIPs.map((ip, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <code className="bg-background px-2 py-1 rounded">
                    {ip.address}:{serverStatus.port}
                  </code>
                  <span className="text-muted-foreground">({ip.name})</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(`${ip.address}:${serverStatus.port}`);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {/* Dolly-style server-config.txt */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Ficheiro de Configuração (Estilo Dolly)</span>
                </div>
                
                {serverConfigFile?.exists ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <code className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                        server-config.txt: {serverConfigFile.serverIP}:{serverConfigFile.serverPort}
                      </code>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteServerConfigFile();
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Eliminar Ficheiro
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Criar ficheiro <code className="bg-muted px-1">server-config.txt</code> para que os clientes 
                      conectem automaticamente ao copiar este ficheiro para a pasta deles.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateServerConfigFile();
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Criar server-config.txt
                    </Button>
                  </div>
                )}
                
                {serverConfigFilePath && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <FolderOpen className="h-3 w-3" />
                    <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{serverConfigFilePath}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(serverConfigFilePath);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                {t.network?.shareIP || 'Partilhe este ficheiro com os outros computadores para conexão automática'}
              </p>
            </div>
          )}
        </div>

        {/* Client Mode */}
        <div 
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            config.mode === 'client' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => handleModeChange('client')}
        >
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{t.network?.client || 'Cliente'}</p>
              <p className="text-sm text-muted-foreground">
                {t.network?.clientDesc || 'Conectar a outro computador que tem os dados'}
              </p>
            </div>
            {config.mode === 'client' && isConnected && (
              <Badge variant="default" className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                {t.network?.connected || 'Conectado'}
              </Badge>
            )}
          </div>

          {/* Client Configuration */}
          {config.mode === 'client' && (
            <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
              
              {/* Dolly-style auto-config detection */}
              {serverConfigFile?.exists && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Ficheiro server-config.txt detectado!
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 mb-2">
                    Servidor: <code className="bg-green-100 dark:bg-green-900/50 px-1 rounded">
                      {serverConfigFile.serverIP}:{serverConfigFile.serverPort}
                    </code>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyServerConfigFile}
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Aplicar e Conectar
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>{t.network?.serverIP || 'Endereço IP do Servidor'}</Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={serverIP}
                    onChange={(e) => setServerIP(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.network?.port || 'Porta'}</Label>
                  <Input
                    placeholder="3847"
                    value={serverPort}
                    onChange={(e) => setServerPort(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : testResult === 'success' ? (
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                  ) : testResult === 'error' ? (
                    <X className="h-4 w-4 mr-2 text-red-600" />
                  ) : (
                    <Wifi className="h-4 w-4 mr-2" />
                  )}
                  {t.network?.testConnection || 'Testar Conexão'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSaveClientConfig}
                >
                  {t.common?.save || 'Guardar'}
                </Button>
              </div>

              {/* Pull/Push Sync Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="default"
                  onClick={handlePull}
                  disabled={isSyncing || !serverIP}
                  className="flex-1"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Baixar do Servidor
                </Button>

                <Button
                  variant="secondary"
                  onClick={handlePush}
                  disabled={isSyncing || !serverIP}
                  className="flex-1"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Enviar para Servidor
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                <strong>Baixar:</strong> Copia os dados do servidor para este computador.<br/>
                <strong>Enviar:</strong> Copia os dados deste computador para o servidor.
              </p>

              {/* Auto-Sync Settings */}
              <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Sincronização Automática</p>
                    <p className="text-sm text-muted-foreground">
                      Baixar dados do servidor automaticamente
                    </p>
                  </div>
                  <Switch
                    checked={config.autoSyncEnabled}
                    onCheckedChange={handleAutoSyncToggle}
                    disabled={!serverIP}
                  />
                </div>

                {config.autoSyncEnabled && (
                  <div className="flex items-center gap-3">
                    <Label className="whitespace-nowrap">Intervalo:</Label>
                    <Select
                      value={String(config.autoSyncInterval ?? 30)}
                      onValueChange={handleIntervalChange}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 segundos</SelectItem>
                        <SelectItem value="30">30 segundos</SelectItem>
                        <SelectItem value="60">1 minuto</SelectItem>
                        <SelectItem value="120">2 minutos</SelectItem>
                        <SelectItem value="300">5 minutos</SelectItem>
                        <SelectItem value="600">10 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {config.autoSyncEnabled && (
                  <p className="text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 inline mr-1" />
                    A sincronizar automaticamente a cada {config.autoSyncInterval} segundos
                  </p>
                )}
              </div>

              {lastSyncTime && (
                <p className="text-xs text-muted-foreground">
                  {t.network?.lastSync || 'Última sincronização'}: {new Date(lastSyncTime).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
