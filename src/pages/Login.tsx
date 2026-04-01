import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import payrollaoLogo from '@/assets/payrollao-logo-preview.png';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { useDeductionStore } from '@/stores/deduction-store';
import { useAbsenceStore } from '@/stores/absence-store';
import { useHolidayStore } from '@/stores/holiday-store';
import { useAttendanceStore } from '@/stores/attendance-store';
import { useBulkAttendanceStore } from '@/stores/bulk-attendance-store';
import { useHRStore } from '@/stores/hr-store';
import { useOvertimePaymentStore } from '@/stores/overtime-payment-store';
import { useDailyAttendanceStore } from '@/stores/daily-attendance-store';
import { useDisciplinaryStore } from '@/stores/disciplinary-store';
import { useLoanStore } from '@/stores/loan-store';
import { validateMasterPassword } from '@/lib/device-security';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { useCompanyLogo } from '@/hooks/use-company-logo';
import { Building2, Plus, Loader2 } from 'lucide-react';
import { liveListCompanies, liveCreateCompany, liveSetActiveCompany } from '@/lib/db-live';
import { Checkbox } from '@/components/ui/checkbox';

interface Company {
  id: string;
  name: string;
  dbFile: string;
}

export function LoginPage() {
  const { t, language } = useLanguage();
  const { login, users, addUser, updateUser, loadUsers } = useAuthStore();
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const companyLogo = useCompanyLogo();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Company selection
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyReady, setCompanyReady] = useState(false);

  // New company dialog
  const [newCompanyOpen, setNewCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyLoading, setNewCompanyLoading] = useState(false);

  // Recovery dialog
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

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const list = await liveListCompanies();
      setCompanies(list);

      const lastCompanyId = localStorage.getItem('payroll_last_company_id');
      const shouldRestoreLast = !!lastCompanyId && list.some((c) => c.id === lastCompanyId);

      // Auto-select when there is only one company OR we have a valid last company
      if (list.length === 1 || shouldRestoreLast) {
        await selectCompany(shouldRestoreLast ? (lastCompanyId as string) : list[0].id);
      } else {
        setSelectedCompanyId('');
        setCompanyReady(false);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
      setCompanyReady(false);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const selectCompany = async (companyId: string) => {
    setCompanyReady(false);
    setSelectedCompanyId(companyId);

    try {
      const success = await liveSetActiveCompany(companyId);
      if (!success) {
        throw new Error('set_active_company_failed');
      }

      // Reset settings store to defaults before loading — prevents stale data from previous company
      useSettingsStore.setState({
        settings: {
          companyName: '', companyLogo: '', nif: '', address: '', city: '',
          province: '', municipality: '', phone: '', phone2: '', email: '',
          website: '', bank: '', iban: '', payday: 27, currency: 'AOA (Kwanza)',
          emailPaymentProcessed: true, monthEndReminder: true, holidayAlerts: false, newEmployees: true,
        },
        isLoaded: false,
      });

      await Promise.all([loadUsers(), loadSettings()]);
      localStorage.setItem('payroll_last_company_id', companyId);
      setCompanyReady(true);
    } catch (err) {
      setCompanyReady(false);
      toast.error(
        language === 'pt'
          ? 'Erro ao conectar à base de dados da empresa'
          : 'Error connecting to company database'
      );
    }
  };

  const handleCompanyChange = async (value: string) => {
    if (value === '__new__') {
      setNewCompanyOpen(true);
      return;
    }
    await selectCompany(value);
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error(
        language === 'pt'
          ? 'Introduza o nome da empresa'
          : 'Enter company name'
      );
      return;
    }

    setNewCompanyLoading(true);
    try {
      const result = await liveCreateCompany(newCompanyName.trim());
      if (result.success && result.company) {
        toast.success(
          language === 'pt'
            ? `Empresa "${result.company.name}" criada com sucesso`
            : `Company "${result.company.name}" created successfully`
        );
        setNewCompanyOpen(false);
        setNewCompanyName('');
        // Refresh list and select new company
        await loadCompanies();
        await selectCompany(result.company.id);
      } else {
        toast.error(result.error || 'Failed to create company');
      }
    } catch (err) {
      toast.error(
        language === 'pt'
          ? 'Erro ao criar empresa'
          : 'Error creating company'
      );
    } finally {
      setNewCompanyLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompanyId || !companyReady) {
      toast.error(
        language === 'pt'
          ? 'Seleccione uma empresa primeiro'
          : 'Select a company first'
      );
      return;
    }

    setLoading(true);

    const result = login(username, password, rememberMe);

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
        const res = await updateUser(sysadmin.id, {
          password: parsed.data.newAdminPassword,
          role: 'admin',
          isActive: true,
          name: sysadmin.name || 'Administrador',
        });
        if (!res.success) throw new Error(res.error || 'Failed');
      } else {
        const res = await addUser({
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

  const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company Logo"
                className="h-20 object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <img src={payrollaoLogo} alt="PayrollAO" className="h-16 w-auto object-contain" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-display">
            {language === 'pt' ? 'Sistema de Folha Salarial' : 'Payroll System'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company selector */}
            <div className="space-y-2">
              <Label htmlFor="company">
                {language === 'pt' ? 'Empresa' : 'Company'}
              </Label>
              {companiesLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/30">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {language === 'pt' ? 'A carregar empresas...' : 'Loading companies...'}
                  </span>
                </div>
              ) : (
                <Select
                  value={selectedCompanyId === '__new__' ? '' : selectedCompanyId}
                  onValueChange={handleCompanyChange}
                >
                  <SelectTrigger id="company">
                    <SelectValue
                      placeholder={
                        language === 'pt'
                          ? 'Seleccione a empresa'
                          : 'Select company'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {company.name}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">
                      <div className="flex items-center gap-2 text-primary">
                        <Plus className="h-4 w-4" />
                        {language === 'pt' ? 'Nova Empresa' : 'New Company'}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {selectedCompanyId && companyReady && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ {selectedCompanyName}
                </p>
              )}
            </div>

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
                disabled={!companyReady}
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
                disabled={!companyReady}
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={!companyReady}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                {language === 'pt' ? 'Manter sessão iniciada' : 'Stay logged in'}
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !companyReady}>
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

      {/* New Company Dialog */}
      <Dialog open={newCompanyOpen} onOpenChange={setNewCompanyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'pt' ? 'Nova Empresa' : 'New Company'}
            </DialogTitle>
            <DialogDescription>
              {language === 'pt'
                ? 'Crie uma nova empresa com a sua própria base de dados isolada.'
                : 'Create a new company with its own isolated database.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newCompanyName">
                {language === 'pt' ? 'Nome da Empresa' : 'Company Name'}
              </Label>
              <Input
                id="newCompanyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder={language === 'pt' ? 'Ex: Merson Lda' : 'e.g. Merson Ltd'}
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCompany();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewCompanyOpen(false);
                setNewCompanyName('');
              }}
              disabled={newCompanyLoading}
            >
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              onClick={handleCreateCompany}
              disabled={newCompanyLoading || !newCompanyName.trim()}
            >
              {newCompanyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'pt' ? 'A criar...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'pt' ? 'Criar Empresa' : 'Create Company'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
