import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import companyLogo from '@/assets/distri-good-logo.jpeg';

export function LoginPage() {
  const { t, language } = useLanguage();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = login(username, password);
    
    if (!result.success) {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              className="h-20 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-display">
            {language === 'pt' ? 'Sistema de Folha Salarial' : 'Payroll System'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                {language === 'pt' ? 'Utilizador' : 'Username'}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={language === 'pt' ? 'Digite o utilizador' : 'Enter username'}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">
                {language === 'pt' ? 'Palavra-passe' : 'Password'}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === 'pt' ? 'Digite a palavra-passe' : 'Enter password'}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? (language === 'pt' ? 'A entrar...' : 'Logging in...') 
                : (language === 'pt' ? 'Entrar' : 'Login')
              }
            </Button>
          </form>
          
        </CardContent>
      </Card>
    </div>
  );
}
