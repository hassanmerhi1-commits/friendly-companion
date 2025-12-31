import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, FolderOpen, Plus, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';

function isElectron() {
  return typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
}

export function DatabaseSettings() {
  const { language } = useLanguage();
  const [ipContent, setIpContent] = useState('');
  const [ipFilePath, setIpFilePath] = useState('');
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    if (!isElectron()) return;
    try {
      const [ipFile, status, filePath] = await Promise.all([
        (window as any).electronAPI.ipfile.read(),
        (window as any).electronAPI.db.getStatus(),
        (window as any).electronAPI.network.getIPFilePath(),
      ]);
      setIpContent(ipFile?.content || '');
      setIpFilePath(filePath || '');
      setDbStatus(status);
    } catch (error) {
      console.error('Error loading status:', error);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSaveIPFile = async () => {
    if (!isElectron()) return;
    setLoading(true);
    try {
      await (window as any).electronAPI.ipfile.write(ipContent);
      toast.success(language === 'pt' ? 'Ficheiro IP guardado!' : 'IP file saved!');
      await loadStatus();
    } catch (error) {
      toast.error(language === 'pt' ? 'Erro ao guardar' : 'Error saving');
    }
    setLoading(false);
  };

  const handleCreateDatabase = async () => {
    if (!isElectron()) return;
    setLoading(true);
    try {
      const result = await (window as any).electronAPI.db.create();
      if (result?.success) {
        toast.success(language === 'pt' ? 'Base de dados criada com sucesso!' : 'Database created successfully!');
        await loadStatus();
      } else {
        toast.error(result?.error || (language === 'pt' ? 'Erro ao criar base de dados' : 'Error creating database'));
      }
    } catch (error) {
      toast.error(language === 'pt' ? 'Erro ao criar base de dados' : 'Error creating database');
    }
    setLoading(false);
  };

  const handleRestart = async () => {
    if (!isElectron()) return;
    await (window as any).electronAPI.app.relaunch();
  };

  if (!isElectron()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {language === 'pt' ? 'Base de Dados' : 'Database'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {language === 'pt' ? 'Disponível apenas no Electron' : 'Only available in Electron'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {language === 'pt' ? 'Configuração da Base de Dados' : 'Database Configuration'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* IP File Configuration */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            {language === 'pt' ? 'Ficheiro IP' : 'IP File'} 
            <span className="text-xs text-muted-foreground">({ipFilePath})</span>
          </Label>
          <Input
            value={ipContent}
            onChange={(e) => setIpContent(e.target.value)}
            placeholder={language === 'pt' 
              ? 'Ex: C:\\PayrollAO\\payroll.db ou 10.0.0.10:C:\\PayrollAO\\payroll.db' 
              : 'Ex: C:\\PayrollAO\\payroll.db or 10.0.0.10:C:\\PayrollAO\\payroll.db'}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {language === 'pt' 
              ? 'Servidor: caminho local. Cliente: IP:caminho' 
              : 'Server: local path. Client: IP:path'}
          </p>
          <Button onClick={handleSaveIPFile} disabled={loading} size="sm">
            {language === 'pt' ? 'Guardar' : 'Save'}
          </Button>
        </div>

        {/* Database Status */}
        <div className="border-t pt-4 space-y-2">
          <Label>{language === 'pt' ? 'Estado da Base de Dados' : 'Database Status'}</Label>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              {dbStatus?.configured ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              <span>{language === 'pt' ? 'Configurado' : 'Configured'}: {dbStatus?.configured ? 'Sim' : 'Não'}</span>
            </div>
            <div className="flex items-center gap-2">
              {dbStatus?.exists ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              <span>{language === 'pt' ? 'Base de dados existe' : 'Database exists'}: {dbStatus?.exists ? 'Sim' : 'Não'}</span>
            </div>
            {dbStatus?.path && (
              <div className="text-xs text-muted-foreground font-mono">{dbStatus.path}</div>
            )}
            {dbStatus?.error && (
              <div className="text-xs text-destructive">{dbStatus.error}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t pt-4">
          {dbStatus?.configured && !dbStatus?.exists && !dbStatus?.isClient && (
            <Button onClick={handleCreateDatabase} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'pt' ? 'Criar Base de Dados' : 'Create Database'}
            </Button>
          )}
          <Button onClick={handleRestart} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Reiniciar App' : 'Restart App'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
