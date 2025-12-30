import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/stores/auth-store';
import { validateMasterPassword } from '@/lib/device-security';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import companyLogo from '@/assets/distri-good-logo.jpeg';

export function LoginPage() {
  const { t, language } = useLanguage();
  const { login, users, addUser, updateUser } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmNewAdminPassword, setConfirmNewAdminPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const recoverySchema = useMemo(
    () =>
      z
        .object({
          masterPassword: z.string().trim().min(1).max(128),
          newAdminPassword: z.string().min(6).max(128),
          confirmNewAdminPassword: z.string().min(6).max(128),
        })
        .refine((v) => v.newAdminPassword === v.confirmNewAdminPassword, {
          message:
            language === 'pt'
              ? 'As palavras-passe não coincidem'
              : 'Passwords do not match',
          path: ['confirmNewAdminPassword'],
        }),
    [language],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = login(username, password);

    if (!result.success) {
      toast.error(result.error);
    }

    setLoading(false);
  };

  const handleRecoverAdmin = async () => {
    const parsed = recoverySchema.safeParse({
      masterPassword,
      newAdminPassword,
      confirmNewAdminPassword,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    if (!validateMasterPassword(parsed.data.masterPassword)) {
      toast.error(
        language === 'pt'
          ? 'Palavra-passe mestre inválida'
          : 'Invalid master password',
      );
      return;
    }

    setRecoveryLoading(true);
    try {
      const sysadmin = users.find((u) => u.username.toLowerCase() === 'sysadmin');

      if (sysadmin) {
        const res = updateUser(sysadmin.id, {
          password: parsed.data.newAdminPassword,
          role: 'admin',
          isActive: true,
          name: sysadmin.name || 'Administrador',
        });
        if (!res.success) throw new Error(res.error || 'Failed');
      } else {
        const res = addUser({
          username: 'sysadmin',
          password: parsed.data.newAdminPassword,
          name: 'Administrador',
          role: 'admin',
          isActive: true,
        });
        if (!res.success) throw new Error(res.error || 'Failed');
      }

      toast.success(
        language === 'pt'
          ? 'Acesso recuperado. Pode entrar agora.'
          : 'Access recovered. You can log in now.',
      );

      setRecoveryOpen(false);
      setUsername('sysadmin');
      setPassword(parsed.data.newAdminPassword);
      setMasterPassword('');
      setNewAdminPassword('');
      setConfirmNewAdminPassword('');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : language === 'pt'
            ? 'Falha ao recuperar acesso'
            : 'Failed to recover access',
      );
    } finally {
      setRecoveryLoading(false);
    }
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
                autoComplete="username"
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
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? language === 'pt'
                  ? 'A entrar...'
                  : 'Logging in...'
                : language === 'pt'
                  ? 'Entrar'
                  : 'Login'}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <AlertDialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="link" className="px-0 text-sm">
                  {language === 'pt'
                    ? 'Recuperar acesso (Admin)'
                    : 'Recover access (Admin)'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {language === 'pt'
                      ? 'Recuperação de Acesso'
                      : 'Access Recovery'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {language === 'pt'
                      ? 'Use a palavra-passe mestre para redefinir a palavra-passe do utilizador sysadmin nesta província.'
                      : 'Use the master password to reset the sysadmin password for this province.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="masterPassword">
                      {language === 'pt'
                        ? 'Palavra-passe mestre'
                        : 'Master password'}
                    </Label>
                    <Input
                      id="masterPassword"
                      type="password"
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newAdminPassword">
                      {language === 'pt'
                        ? 'Nova palavra-passe (sysadmin)'
                        : 'New password (sysadmin)'}
                    </Label>
                    <Input
                      id="newAdminPassword"
                      type="password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmNewAdminPassword">
                      {language === 'pt'
                        ? 'Confirmar nova palavra-passe'
                        : 'Confirm new password'}
                    </Label>
                    <Input
                      id="confirmNewAdminPassword"
                      type="password"
                      value={confirmNewAdminPassword}
                      onChange={(e) => setConfirmNewAdminPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {language === 'pt' ? 'Cancelar' : 'Cancel'}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void handleRecoverAdmin();
                    }}
                    disabled={recoveryLoading}
                  >
                    {recoveryLoading
                      ? language === 'pt'
                        ? 'A processar...'
                        : 'Processing...'
                      : language === 'pt'
                        ? 'Redefinir'
                        : 'Reset'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <p className="text-xs text-muted-foreground">
              {language === 'pt'
                ? 'Precisa de ajuda? Contacte o suporte.'
                : 'Need help? Contact support.'}
            </p>
          </div>

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
