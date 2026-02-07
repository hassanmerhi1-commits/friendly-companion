import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/lib/i18n';
import { Shield, AlertTriangle } from 'lucide-react';

interface AdminPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  warningMessage?: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  variant?: 'default' | 'destructive';
}

export function AdminPasswordDialog({
  open,
  onOpenChange,
  title,
  description,
  warningMessage,
  onConfirm,
  confirmText,
  variant = 'default',
}: AdminPasswordDialogProps) {
  const { language } = useLanguage();
  const { users } = useAuthStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get all admin users for password validation
  const adminUsers = users.filter((u) => u.role === 'admin' && u.isActive);

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError(language === 'pt' ? 'Introduza a palavra-passe' : 'Enter password');
      return;
    }

    // Validate password against ANY admin user
    const isValidAdmin = adminUsers.some((admin) => admin.password === password);

    if (!isValidAdmin) {
      setError(
        language === 'pt'
          ? 'Palavra-passe de administrador inválida'
          : 'Invalid administrator password'
      );
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onConfirm();
      setPassword('');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || (language === 'pt' ? 'Erro ao processar' : 'Processing error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {warningMessage && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{warningMessage}</p>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">
              {language === 'pt' ? 'Palavra-passe de Administrador' : 'Administrator Password'}
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirm();
                }
              }}
              placeholder={language === 'pt' ? 'Introduza a palavra-passe' : 'Enter password'}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading || !password.trim()}
          >
            {isLoading
              ? language === 'pt'
                ? 'A processar...'
                : 'Processing...'
              : confirmText || (language === 'pt' ? 'Confirmar' : 'Confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
