import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { validateMasterPassword, activateDevice } from '@/lib/device-security';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface DeviceActivationProps {
  onActivated: () => void;
}

export function DeviceActivation({ onActivated }: DeviceActivationProps) {
  const { language } = useLanguage();
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Lock after 5 failed attempts
    if (attempts >= 5) {
      setLocked(true);
      toast.error(
        language === 'pt' 
          ? 'Sistema bloqueado. Contacte o desenvolvedor.' 
          : 'System locked. Contact the developer.'
      );
      setLoading(false);
      return;
    }

    if (validateMasterPassword(password)) {
      activateDevice();
      toast.success(
        language === 'pt' 
          ? 'Dispositivo activado com sucesso!' 
          : 'Device activated successfully!'
      );
      onActivated();
    } else {
      setAttempts(prev => prev + 1);
      toast.error(
        language === 'pt' 
          ? `Palavra-passe incorrecta. Tentativas restantes: ${5 - attempts - 1}` 
          : `Incorrect password. Attempts remaining: ${5 - attempts - 1}`
      );
    }

    setLoading(false);
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              className="h-16 object-contain"
            />
          </div>
          <div className="flex justify-center">
            <div className="p-3 bg-destructive/10 rounded-full">
              <Shield className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl font-display">
            {language === 'pt' ? 'Activação Necessária' : 'Activation Required'}
          </CardTitle>
          <CardDescription className="text-sm">
            {language === 'pt' 
              ? 'Este sistema foi transferido para um novo dispositivo. É necessária a palavra-passe de activação para continuar.'
              : 'This system has been transferred to a new device. Activation password is required to continue.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locked ? (
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-destructive font-medium">
                {language === 'pt' 
                  ? 'Sistema bloqueado por excesso de tentativas.'
                  : 'System locked due to too many attempts.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'pt' 
                  ? 'Contacte o desenvolvedor: Hassan Merhi'
                  : 'Contact the developer: Hassan Merhi'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activation-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {language === 'pt' ? 'Palavra-passe de Activação' : 'Activation Password'}
                </Label>
                <Input
                  id="activation-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'pt' ? 'Digite a palavra-passe' : 'Enter password'}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading 
                  ? (language === 'pt' ? 'A verificar...' : 'Verifying...') 
                  : (language === 'pt' ? 'Activar Dispositivo' : 'Activate Device')
                }
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                {language === 'pt' 
                  ? 'Esta palavra-passe é fornecida apenas pelo desenvolvedor do sistema.'
                  : 'This password is only provided by the system developer.'}
              </p>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Desenvolvido por <span className="font-medium">Hassan Merhi</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
