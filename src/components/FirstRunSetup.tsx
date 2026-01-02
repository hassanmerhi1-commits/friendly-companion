import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Server, Monitor, Database, Wifi } from "lucide-react";

interface FirstRunSetupProps {
  onComplete: () => void;
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;
}

export function FirstRunSetup({ onComplete }: FirstRunSetupProps) {
  const [mode, setMode] = useState<'server' | 'client'>('server');
  const [serverAddress, setServerAddress] = useState('');
  const [dbPath, setDbPath] = useState('C:\\PayrollAO\\payroll.db');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!isElectron()) return;

    setLoading(true);
    setError(null);

    try {
      const api = (window as any).electronAPI;
      
      if (mode === 'server') {
        // Server mode: save database path
        if (!dbPath.trim()) {
          setError('Introduza o caminho da base de dados');
          setLoading(false);
          return;
        }
        await api.writeIPFile(dbPath.trim());
      } else {
        // Client mode: save server address
        if (!serverAddress.trim()) {
          setError('Introduza o nome ou IP do servidor');
          setLoading(false);
          return;
        }
        await api.writeIPFile(serverAddress.trim());
      }

      // Restart the app to apply changes
      await api.relaunch();
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError(err instanceof Error ? err.message : 'Erro ao guardar configuração');
      setLoading(false);
    }
  };

  if (!isElectron()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Modo de Demonstração</CardTitle>
            <CardDescription>
              Esta funcionalidade só está disponível na aplicação Electron.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao PayrollAO</CardTitle>
          <CardDescription>
            Configure como este computador irá funcionar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={mode} 
            onValueChange={(v) => setMode(v as 'server' | 'client')}
            className="space-y-3"
          >
            <div className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${mode === 'server' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
              <RadioGroupItem value="server" id="server" className="mt-1" />
              <Label htmlFor="server" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium">
                  <Server className="w-4 h-4" />
                  Servidor (Computador Principal)
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Este computador terá a base de dados e outros computadores irão ligar-se a ele.
                </p>
              </Label>
            </div>
            
            <div className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${mode === 'client' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
              <RadioGroupItem value="client" id="client" className="mt-1" />
              <Label htmlFor="client" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium">
                  <Monitor className="w-4 h-4" />
                  Cliente (Computador Secundário)
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Este computador irá ligar-se a outro computador que tem a base de dados.
                </p>
              </Label>
            </div>
          </RadioGroup>

          {mode === 'server' && (
            <div className="space-y-2">
              <Label htmlFor="dbPath">Caminho da Base de Dados</Label>
              <Input
                id="dbPath"
                value={dbPath}
                onChange={(e) => setDbPath(e.target.value)}
                placeholder="C:\PayrollAO\payroll.db"
              />
              <p className="text-xs text-muted-foreground">
                A base de dados será criada automaticamente neste local.
              </p>
            </div>
          )}

          {mode === 'client' && (
            <div className="space-y-2">
              <Label htmlFor="serverAddress">Nome ou IP do Servidor</Label>
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="serverAddress"
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder="SERVIDOR ou 192.168.1.100"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Introduza o nome do computador ou endereço IP do servidor.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'A configurar...' : 'Iniciar PayrollAO'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
