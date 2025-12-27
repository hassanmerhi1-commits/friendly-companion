import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Upload
} from 'lucide-react';

export const NetworkSettings = () => {
  const { t } = useLanguage();
  const { 
    config, 
    serverStatus, 
    isConnected,
    lastSyncTime,
    isSyncing,
    setConfig, 
    startServer, 
    stopServer, 
    pullFromServer,
    pushToServer,
    testConnection,
    getLocalIPs,
    refreshServerStatus
  } = useNetworkStore();

  const [localIPs, setLocalIPs] = useState<{ name: string; address: string }[]>([]);
  const [serverIP, setServerIP] = useState(config.serverIP);
  const [serverPort, setServerPort] = useState(config.serverPort.toString());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const isElectron = typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;

  useEffect(() => {
    if (isElectron) {
      refreshServerStatus();
      getLocalIPs().then(setLocalIPs);
    }
  }, []);

  useEffect(() => {
    setServerIP(config.serverIP);
    setServerPort(config.serverPort.toString());
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
      await setConfig({ ...config, mode: 'standalone', serverIP: '' });
      toast.success(t.network?.modeChanged || 'Modo alterado para local');
    } else if (mode === 'client') {
      await setConfig({ ...config, mode: 'client' });
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
    await setConfig({
      mode: 'client',
      serverIP,
      serverPort: parseInt(serverPort) || 3847
    });
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t.network?.copied || 'Copiado!');
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
            <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
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
              <p className="text-xs text-muted-foreground mt-2">
                {t.network?.shareIP || 'Partilhe este endereço com os outros computadores'}
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
